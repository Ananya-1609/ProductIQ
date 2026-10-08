from fastapi import Depends, FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from product_analyzer import analyze_product
from ml_model.predict import predict_image
from product_routes import router as product_router
from seller_routes import router as seller_router
from store_routes import router as store_router
from auth import router as auth_router
from auth import require_catalog_contributor, require_reviewer
from bson import ObjectId
from pathlib import Path
import mimetypes
from validation_engine import validate_product
from database import products_collection

from datetime import datetime, timezone
import logging
from upload_validation import (
    UploadRequestBodyLimitMiddleware,
    read_validated_image,
    save_validated_image,
)


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="E-Commerce Product Intelligence API",
    version="1.0.0"
)

app.add_middleware(UploadRequestBodyLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    product_router
)
app.include_router(store_router)
app.include_router(seller_router)
app.include_router(auth_router)


# ============================================================
# UPLOAD DIRECTORY
# ============================================================

UPLOAD_DIR = "uploads"
UPLOAD_ROOT = Path(UPLOAD_DIR).resolve()
logger = logging.getLogger(__name__)

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


def _stored_image_path(product):
    filename = product.get("image_filename", "")
    if not filename or Path(filename).name != filename:
        raise HTTPException(status_code=404, detail="Product image not found")
    image_path = (UPLOAD_ROOT / filename).resolve()
    if image_path.parent != UPLOAD_ROOT or not image_path.is_file():
        raise HTTPException(status_code=404, detail="Product image not found")
    return image_path


@app.get("/products/{product_id}/image")
def get_reviewer_product_image(product_id: str, _reviewer=Depends(require_reviewer)):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=404, detail="Product image not found")
    product = products_collection.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product image not found")
    image_path = _stored_image_path(product)
    return FileResponse(image_path, media_type=mimetypes.guess_type(image_path.name)[0] or "application/octet-stream")


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "message":
        "E-Commerce Product Intelligence API is running"
    }


# ============================================================
# ML CLASSIFICATION
# ============================================================

@app.post("/predict")
async def predict_product_image(
    file: UploadFile = File(...),
    _contributor=Depends(require_catalog_contributor)
):
    """
    Classify an uploaded product image into:

    accessories
    bags
    clothing
    footwear
    """

    # --------------------------------------------------------
    # Validate file
    # --------------------------------------------------------

    image_bytes, extension, _mime_type = await read_validated_image(file)
    filename, file_path = save_validated_image(image_bytes, extension, UPLOAD_ROOT)

    try:

        # ----------------------------------------------------
        # Run MobileNetV2
        # ----------------------------------------------------

        result = predict_image(
            file_path
        )

        return {

            "success": True,

            "filename": file.filename,

            "category": result[
                "category"
            ],

            "confidence": result[
                "confidence"
            ],

            "probabilities": result[
                "probabilities"
            ]
        }

    except HTTPException:
        raise
    except Exception:
        logger.exception("Product prediction failed")
        raise HTTPException(status_code=500, detail="Product prediction failed. Please try again.") from None

    finally:

        # ----------------------------------------------------
        # Delete temporary image
        # ----------------------------------------------------

        if os.path.exists(
            file_path
        ):

            os.remove(
                file_path
            )


# ============================================================
# FULL PRODUCT ANALYSIS
# ============================================================

@app.post("/analyze")
async def analyze_product_image(
    file: UploadFile = File(...),
    contributor=Depends(require_catalog_contributor)
):

    # --------------------------------------------------------
    # Validate file type
    # --------------------------------------------------------

    image_bytes, extension, mime_type = await read_validated_image(file)
    temporary_filename, file_path = save_validated_image(image_bytes, extension, UPLOAD_ROOT)

    analysis_succeeded = False
    try:

        # ====================================================
        # 1. MOBILE NET CLASSIFICATION
        # ====================================================

        ml_result = predict_image(
            file_path
        )

        # ====================================================
        # 2. GEMINI DETAILED ANALYSIS
        # ====================================================

        gemini_result = analyze_product(file_path, mime_type=mime_type)

        # ====================================================
        # 3. VALIDATION
        # ====================================================

        validation_result = validate_product(
            ml_result,
            gemini_result
        )

        # ====================================================
        # 4. DETERMINE FINAL STATUS
        # ====================================================

        final_status = (
            validation_result.get(
                "overall_status",
                "REVIEW"
            )
        )

        # ====================================================
        # 5. BUILD COMPLETE DATABASE RECORD
        # ====================================================

        now = datetime.now(
            timezone.utc
        )

        product_document = {
            # Original uploaded filename
            "filename": file.filename,

            # MobileNet result
            "ml_prediction": {

                "category":
                    ml_result[
                        "category"
                    ],

                "confidence":
                    ml_result[
                        "confidence"
                    ],

                "probabilities":
                    ml_result[
                        "probabilities"
                    ]
            },

            # Gemini result
            "gemini_analysis":
                gemini_result,

            "catalog_fields": {
                "product_title": gemini_result.get("product_title") or "",
                "price": None,
                "sizes": [],
                "tags": gemini_result.get("tags") or [],
                "seo_keywords": gemini_result.get("seo_keywords") or gemini_result.get("keywords") or [],
            },

            # Combined validation
            "validation":
                validation_result,

            # Keep analysis for
            # existing frontend
            "analysis":
                gemini_result,

            # Final product status
            "status":
                final_status,

            "publication_status": (
                "PENDING_REVIEW"
                if final_status in {"ACCEPT", "REVIEW"}
                else "DRAFT"
            ),

            "created_at":
                now,

            "updated_at":
                now
            ,
            "image_filename": temporary_filename
        }

        if contributor.get("role") == "SELLER":
            product_document["owner_google_sub"] = contributor.get("google_sub")

        # ====================================================
        # 6. SAVE TO MONGODB
        # ====================================================

        mongo_result = (
            products_collection.insert_one(
                product_document
            )
        )

        product_id = str(
            mongo_result.inserted_id
        )
        analysis_succeeded = True

        logger.info("Product analysis completed")

        # ====================================================
        # 7. RETURN COMPLETE RESPONSE
        # ====================================================

        return {

            "success": True,

            "product_id":
                product_id,

            "filename":
                file.filename,

            "status":
                final_status,

            "publication_status":
                product_document[
                    "publication_status"
                ],

            "ml_prediction": {

                "category":
                    ml_result[
                        "category"
                    ],

                "confidence":
                    ml_result[
                        "confidence"
                    ],

                "probabilities":
                    ml_result[
                        "probabilities"
                    ]
            },

            "gemini_analysis":
                gemini_result,

            "catalog_fields": product_document["catalog_fields"],

            "validation":
                validation_result,

            # Existing React compatibility
            "analysis":
                gemini_result
        }

    except HTTPException:
        raise
    except Exception:
        logger.exception("Product analysis failed")
        raise HTTPException(status_code=500, detail="Product analysis failed. Please try again.") from None

    finally:

        # ====================================================
        # Keep successful uploads for authorized product image retrieval.
        # ====================================================

        if not analysis_succeeded and os.path.exists(file_path):

            os.remove(
                file_path
            )
