import asyncio
import io
import os
import re
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers
from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from upload_validation import MAX_IMAGE_SIZE_BYTES, read_validated_image, save_validated_image
from validation_engine import validate_product


def upload(filename, payload, content_type="application/octet-stream"):
    return UploadFile(
        filename=filename,
        file=io.BytesIO(payload),
        headers=Headers({"content-type": content_type}),
    )


def image_bytes(image_format):
    stream = io.BytesIO()
    Image.new("RGB", (12, 8), color="teal").save(stream, format=image_format)
    return stream.getvalue()


class UploadValidationTests(unittest.TestCase):
    def test_valid_image_formats_and_generated_safe_names(self):
        for fmt, ext, mime in (("JPEG", ".jpg", "image/jpeg"), ("PNG", ".png", "image/png"), ("WEBP", ".webp", "image/webp")):
            with self.subTest(fmt=fmt):
                raw = image_bytes(fmt)
                data, actual_ext, actual_mime = asyncio.run(read_validated_image(upload("../../unsafe" + ext, raw)))
                self.assertEqual((actual_ext, actual_mime), (ext, mime))
                with tempfile.TemporaryDirectory() as directory:
                    filename, path = save_validated_image(data, actual_ext, Path(directory))
                    self.assertEqual(Path(path).parent, Path(directory).resolve())
                    self.assertEqual(Path(filename).name, filename)
                    self.assertNotIn("unsafe", filename)

    def test_misleading_mime_uses_image_content(self):
        _, extension, mime = asyncio.run(read_validated_image(upload("photo.png", image_bytes("PNG"), "image/jpeg")))
        self.assertEqual((extension, mime), (".png", "image/png"))

    def test_invalid_uploads_are_rejected(self):
        cases = [
            ("fake.jpg", b"not an image", "image/jpeg", 400),
            ("broken.jpg", image_bytes("JPEG")[:-8], "image/jpeg", 400),
            ("empty.jpg", b"", "image/jpeg", 400),
            ("large.jpg", b"x" * (MAX_IMAGE_SIZE_BYTES + 1), "image/jpeg", 413),
            ("photo.gif", image_bytes("JPEG"), "image/gif", 415),
            ("wrong.png", image_bytes("JPEG"), "image/png", 415),
        ]
        for filename, data, mime, expected_status in cases:
            with self.subTest(filename=filename):
                with self.assertRaises(HTTPException) as raised:
                    asyncio.run(read_validated_image(upload(filename, data, mime)))
                self.assertEqual(raised.exception.status_code, expected_status)


def field(value, confidence=0.95, evidence_type="VISUAL"):
    return {"value": value, "confidence": confidence, "evidence_type": evidence_type}


def valid_analysis(category="footwear"):
    return {
        "category": field(category), "subcategory": field("sneakers"), "gender": field("unisex"),
        "color": field("white"), "brand": field(None), "material": field("canvas"),
        "closure": field(None), "sole": field("rubber"),
    }


class ValidationTests(unittest.TestCase):
    def test_complete_unknown_optional_and_required_unknown(self):
        self.assertEqual(validate_product({"category": "footwear"}, valid_analysis())["overall_status"], "ACCEPT")
        for category in ("clothing", "footwear", "bags", "accessories"):
            with self.subTest(category=category):
                self.assertEqual(validate_product({"category": category}, valid_analysis(category))["overall_status"], "ACCEPT")
        optional = valid_analysis()
        optional["brand"] = field(None, 0, "UNKNOWN")
        optional["closure"] = field(None, 0, "UNKNOWN")
        self.assertEqual(validate_product({"category": "footwear"}, optional)["overall_status"], "ACCEPT")
        required = valid_analysis()
        required["material"] = field(None, 0, "UNKNOWN")
        self.assertEqual(validate_product({"category": "footwear"}, required)["overall_status"], "REVIEW")

    def test_missing_category_mismatch_and_all_unknown_need_review(self):
        missing = valid_analysis()
        del missing["color"]
        self.assertEqual(validate_product({"category": "footwear"}, missing)["overall_status"], "REVIEW")
        mismatch = validate_product({"category": "bags"}, valid_analysis())
        self.assertEqual(mismatch["overall_status"], "REVIEW")
        unknown = {name: field(None, 0, "UNKNOWN") for name in valid_analysis()}
        self.assertEqual(validate_product({"category": "unknown"}, unknown)["overall_status"], "REVIEW")


class StoreSearchTests(unittest.TestCase):
    def test_legacy_and_structured_category_queries_keep_published_filter(self):
        captured = {}

        class Cursor:
            def __init__(self, rows):
                self.rows = rows

            def sort(self, *_args):
                return self.rows

        rows = [
            {"_id": "1", "filename": "shoe-legacy.jpg", "publication_status": "PUBLISHED", "analysis": {"category": "Footwear"}},
            {"_id": "2", "filename": "shoe-structured.png", "publication_status": "PUBLISHED", "analysis": {"category": {"value": "Footwear"}}},
            {"_id": "3", "filename": "shoe-pending.jpg", "publication_status": "PENDING_REVIEW", "analysis": {"category": "Footwear"}},
            {"_id": "4", "filename": "bag.jpg", "publication_status": "PUBLISHED", "analysis": {"category": {"value": "Bags"}}},
        ]

        def value_at(document, path):
            value = document
            for part in path.split("."):
                if not isinstance(value, dict) or part not in value:
                    return None
                value = value[part]
            return value

        def condition_matches(value, condition):
            if isinstance(condition, dict) and "$regex" in condition:
                flags = re.IGNORECASE if condition.get("$options") == "i" else 0
                pattern = re.compile(condition["$regex"], flags)
                values = value if isinstance(value, list) else [value]
                return any(isinstance(item, str) and pattern.search(item) for item in values)
            return value == condition

        def matches(document, query):
            for key, condition in query.items():
                if key == "$and" and not all(matches(document, clause) for clause in condition):
                    return False
                if key == "$or" and not any(matches(document, clause) for clause in condition):
                    return False
                if not key.startswith("$") and not condition_matches(value_at(document, key), condition):
                    return False
            return True

        class Collection:
            def find(self, query):
                captured["query"] = query
                return Cursor([row for row in rows if matches(row, query)])

        auth_stub = types.ModuleType("auth")
        auth_stub.require_user = lambda: None
        database_stub = types.ModuleType("database")
        database_stub.products_collection = Collection()
        with patch.dict(sys.modules, {"auth": auth_stub, "database": database_stub}):
            sys.modules.pop("store_routes", None)
            import store_routes
            result = store_routes.get_store_products(q="shoe", category="Footwear")
        query = captured["query"]
        self.assertEqual(query["publication_status"], "PUBLISHED")
        self.assertIn("$and", query)
        self.assertIn("$or", query["$and"][0])
        self.assertIn("$or", query["$and"][1])
        self.assertEqual(result["count"], 2)
        self.assertEqual({product["filename"] for product in result["products"]}, {"shoe-legacy.jpg", "shoe-structured.png"})


class SellerWorkflowTests(unittest.TestCase):
    def test_seller_edit_invalidates_review_and_reviewer_can_reapprove_publish(self):
        from bson import ObjectId

        product_id = ObjectId("0123456789abcdef01234567")

        class FakeCollection:
            def __init__(self, status):
                self.document = {"_id": product_id, "owner_google_sub": "seller-sub", "publication_status": status,
                                 "reviewed_at": "old-review", "reviewed_by": {"email": "old"},
                                 "published_at": "old-publish", "published_by": {"email": "old"},
                                 "rejection_reason": "old-reason", "unpublished_at": "old-unpublish",
                                 "unpublished_by": {"email": "old"}}

            def find_one(self, query):
                return self.document if query.get("_id") == product_id else None

            def update_one(self, query, update):
                if query.get("_id") != product_id or query.get("owner_google_sub", "seller-sub") != "seller-sub":
                    return types.SimpleNamespace(matched_count=0)
                expected = query.get("publication_status")
                if expected and expected != self.document.get("publication_status"):
                    return types.SimpleNamespace(matched_count=0)
                self.document.update(update["$set"])
                return types.SimpleNamespace(matched_count=1)

        collection = FakeCollection("PUBLISHED")
        auth_stub = types.ModuleType("auth")
        auth_stub.require_seller = lambda: None
        auth_stub.require_reviewer = lambda: None
        database_stub = types.ModuleType("database")
        database_stub.products_collection = collection
        with patch.dict(sys.modules, {"auth": auth_stub, "database": database_stub}):
            for name in ("seller_routes", "product_routes"):
                sys.modules.pop(name, None)
            import product_routes
            import seller_routes

            seller = {"google_sub": "seller-sub"}
            reviewer = {"google_sub": "reviewer-sub", "email": "reviewer@example.test"}
            seller_routes.update_seller_product(
                str(product_id), seller_routes.SellerProductUpdate(analysis={}, status="REVIEW", publication_status="PUBLISHED"), seller
            )
            self.assertEqual(collection.document["publication_status"], "PENDING_REVIEW")
            for metadata in ("reviewed_at", "reviewed_by", "published_at", "published_by", "rejection_reason", "unpublished_at", "unpublished_by"):
                self.assertIsNone(collection.document[metadata])
            product_routes.approve_product(str(product_id), reviewer)
            self.assertEqual(collection.document["publication_status"], "APPROVED")
            product_routes.publish_product(str(product_id), reviewer)
            self.assertEqual(collection.document["publication_status"], "PUBLISHED")

            for initial in ("DRAFT", "PENDING_REVIEW", "APPROVED"):
                collection.document["publication_status"] = initial
                seller_routes.update_seller_product(
                    str(product_id), seller_routes.SellerProductUpdate(analysis={}, status="REVIEW"), seller
                )
                expected = "PENDING_REVIEW" if initial == "APPROVED" else initial
                self.assertEqual(collection.document["publication_status"], expected)


class AnalysisEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from fastapi import APIRouter, Depends, Header, HTTPException
        from bson import ObjectId

        class Collection:
            def __init__(self):
                self.insert_count = 0

            def insert_one(self, _document):
                self.insert_count += 1
                return types.SimpleNamespace(inserted_id=ObjectId("abcdefabcdefabcdefabcdef"))

            def find(self, _query=None):
                return types.SimpleNamespace(sort=lambda *_args: [])

            def find_one(self, _query):
                return None

            def update_one(self, *_args, **_kwargs):
                return types.SimpleNamespace(matched_count=0)

        cls.collection = Collection()
        auth_stub = types.ModuleType("auth")
        auth_stub.router = APIRouter()

        def get_user(x_test_role: str | None = Header(default=None)):
            if x_test_role not in {"USER", "SELLER", "REVIEWER"}:
                raise HTTPException(status_code=401, detail="Not authenticated")
            return {"role": x_test_role, "google_sub": "seller", "email": "test@example.test", "is_active": True}

        auth_stub.get_current_user = get_user

        def role_dependency(role):
            def check(user=Depends(get_user)):
                if user["role"] != role:
                    raise HTTPException(status_code=403, detail="Role access required")
                return user
            return check

        auth_stub.require_user = role_dependency("USER")
        auth_stub.require_seller = role_dependency("SELLER")
        auth_stub.require_reviewer = role_dependency("REVIEWER")

        def contributor(user=Depends(get_user)):
            if user["role"] not in {"SELLER", "REVIEWER"}:
                raise HTTPException(status_code=403, detail="Contributor access required")
            return user

        auth_stub.require_catalog_contributor = contributor
        database_stub = types.ModuleType("database")
        database_stub.products_collection = cls.collection
        analyzer_stub = types.ModuleType("product_analyzer")
        analyzer_stub.analyze_product = lambda *_args, **_kwargs: {}
        predictor_module = types.ModuleType("ml_model.predict")
        predictor_module.predict_image = lambda *_args: {"category": "footwear", "confidence": 99.0, "probabilities": {}}
        stubs = {"auth": auth_stub, "database": database_stub, "product_analyzer": analyzer_stub,
                 "ml_model.predict": predictor_module}
        with patch.dict(sys.modules, stubs):
            sys.modules.pop("main", None)
            for name in ("product_routes", "seller_routes", "store_routes"):
                sys.modules.pop(name, None)
            import main
            cls.main = main
        cls.temp_directory = tempfile.TemporaryDirectory()
        cls.main.UPLOAD_ROOT = Path(cls.temp_directory.name).resolve()

    @classmethod
    def tearDownClass(cls):
        cls.temp_directory.cleanup()
        sys.modules.pop("main", None)

    def setUp(self):
        self.client = TestClient(self.main.app)

    def test_valid_prediction_and_analysis_use_safe_files_and_verified_mime(self):
        raw = image_bytes("JPEG")
        with patch.object(self.main, "predict_image", return_value={"category": "footwear", "confidence": 99.0, "probabilities": {}}) as predictor:
            response = self.client.post("/predict", files={"file": ("../../shoe.jpg", raw, "image/png")}, headers={"x-test-role": "SELLER"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(predictor.called)
        self.assertEqual(list(self.main.UPLOAD_ROOT.iterdir()), [])

        analysis = {
            "product_title": "Canvas sneaker", "tags": [], "keywords": [], "seo_keywords": [],
            "category": field("footwear"), "subcategory": field("sneakers"), "gender": field("unisex"),
            "color": field("white"), "brand": field(None, 0, "UNKNOWN"), "material": field("canvas"),
            "closure": field(None, 0, "UNKNOWN"), "sole": field("rubber"),
        }
        with patch.object(self.main, "predict_image", return_value={"category": "footwear", "confidence": 99.0, "probabilities": {}}), \
             patch.object(self.main, "analyze_product", return_value=analysis) as analyzer:
            response = self.client.post("/analyze", files={"file": ("shoe.png", image_bytes("PNG"), "image/jpeg")}, headers={"x-test-role": "SELLER"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(analyzer.call_args.kwargs["mime_type"], "image/png")
        self.assertEqual(self.collection.insert_count, 1)

    def test_invalid_upload_precedes_inference_and_internal_errors_are_generic(self):
        with patch.object(self.main, "predict_image") as predictor:
            invalid = self.client.post("/predict", files={"file": ("fake.jpg", b"not image", "image/jpeg")}, headers={"x-test-role": "SELLER"})
        self.assertEqual(invalid.status_code, 400)
        predictor.assert_not_called()

        self.main.logger.disabled = True
        try:
            with patch.object(self.main, "predict_image", side_effect=RuntimeError("private internal marker")):
                failed = self.client.post("/predict", files={"file": ("shoe.jpg", image_bytes("JPEG"), "image/jpeg")}, headers={"x-test-role": "SELLER"})
            self.assertEqual(failed.status_code, 500)
            self.assertEqual(failed.json()["detail"], "Product prediction failed. Please try again.")
            self.assertNotIn("private internal marker", failed.text)
        finally:
            self.main.logger.disabled = False

    def test_request_body_limit_and_root_startup_smoke(self):
        self.assertEqual(self.client.get("/").status_code, 200)
        with patch.object(self.main, "predict_image") as predictor:
            response = self.client.post(
                "/predict",
                files={"file": ("large.jpg", b"x" * (12 * 1024 * 1024), "image/jpeg")},
                headers={"x-test-role": "SELLER", "origin": "http://localhost:5173"},
            )
        self.assertEqual(response.status_code, 413)
        self.assertEqual(response.headers.get("access-control-allow-origin"), "http://localhost:5173")
        predictor.assert_not_called()

    def test_role_boundaries_for_reviewer_seller_and_customer_routes(self):
        cases = (
            ("/products", "REVIEWER", 200), ("/products", "SELLER", 403), ("/products", "USER", 403),
            ("/seller/products", "SELLER", 200), ("/seller/products", "USER", 403), ("/seller/products", "REVIEWER", 403),
            ("/store/products", "USER", 200), ("/store/products", "SELLER", 403), ("/store/products", "REVIEWER", 403),
        )
        for path, role, expected in cases:
            with self.subTest(path=path, role=role):
                response = self.client.get(path, headers={"x-test-role": role})
                self.assertEqual(response.status_code, expected)


class GeminiMimeTests(unittest.TestCase):
    def test_analyzer_builds_parts_with_supported_mime_types(self):
        missing = "GEMINI_API_KEY" not in os.environ
        if missing:
            os.environ["GEMINI_API_KEY"] = "unit-test-placeholder"
        try:
            import product_analyzer
        finally:
            if missing:
                os.environ.pop("GEMINI_API_KEY", None)

        analysis_json = {
            "category": {"value": "footwear", "confidence": 0.95, "evidence_type": "VISUAL"},
            "subcategory": {"value": "shoe", "confidence": 0.95, "evidence_type": "VISUAL"},
            "gender": {"value": "unisex", "confidence": 0.95, "evidence_type": "VISUAL"},
            "color": {"value": "black", "confidence": 0.95, "evidence_type": "VISUAL"},
            "brand": {"value": None, "confidence": 0, "evidence_type": "UNKNOWN"},
            "material": {"value": "canvas", "confidence": 0.95, "evidence_type": "VISUAL"},
            "closure": {"value": None, "confidence": 0, "evidence_type": "UNKNOWN"},
            "sole": {"value": "rubber", "confidence": 0.95, "evidence_type": "VISUAL"},
        }
        for mime_type in ("image/jpeg", "image/png", "image/webp"):
            captured = []
            with patch.object(product_analyzer.types.Part, "from_bytes", side_effect=lambda **kwargs: captured.append(kwargs) or kwargs), \
                 patch.object(product_analyzer.client.models, "generate_content", return_value=types.SimpleNamespace(text=__import__("json").dumps(analysis_json))):
                product_analyzer.analyze_product(__file__, mime_type=mime_type)
            self.assertEqual(captured[0]["mime_type"], mime_type)


if __name__ == "__main__":
    unittest.main()
