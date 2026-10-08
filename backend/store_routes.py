import re
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pathlib import Path
import mimetypes

from auth import require_user
from database import products_collection


router = APIRouter(
    prefix="/store",
    tags=["Store"],
    dependencies=[Depends(require_user)],
)
UPLOAD_ROOT = Path("uploads").resolve()


def _value(analysis: dict[str, Any], field: str, default=""):
    value = analysis.get(field, default)
    if isinstance(value, dict):
        return value.get("value", default) or default
    return value or default


def _customer_product(product):
    analysis = product.get("analysis") or {}
    catalog = product.get("catalog_fields") or {}
    name = (
        catalog.get("product_title")
        or _value(analysis, "product_title")
        or _value(analysis, "subcategory")
        or _value(analysis, "category")
        or product.get("filename")
        or "Product"
    )
    keywords = analysis.get("keywords") or []
    if not isinstance(keywords, list):
        keywords = []

    return {
        "id": str(product["_id"]),
        "name": name,
        "product_title": name,
        "price": catalog.get("price"),
        "sizes": catalog.get("sizes", []) or [],
        "tags": catalog.get("tags", analysis.get("tags", [])) or [],
        "seo_keywords": catalog.get("seo_keywords", analysis.get("seo_keywords", analysis.get("keywords", []))) or [],
        "filename": product.get("filename", ""),
        "category": _value(analysis, "category", "Unknown"),
        "subcategory": _value(analysis, "subcategory", "Unknown"),
        "gender": _value(analysis, "gender"),
        "color": _value(analysis, "color"),
        "brand": _value(analysis, "brand"),
        "material": _value(analysis, "material"),
        "closure": _value(analysis, "closure"),
        "sole": _value(analysis, "sole"),
        "description": _value(analysis, "description"),
        "keywords": [str(keyword) for keyword in keywords],
        "image_url": (
            f"/api/store/products/{product['_id']}/image"
            if product.get("image_filename")
            else product.get("image_url") or product.get("image_preview") or None
        ),
        "created_at": product.get("created_at"),
        "updated_at": product.get("updated_at"),
    }


def _published_filter():
    return {"publication_status": "PUBLISHED"}


@router.get("/products")
def get_store_products(
    q: str = Query(default=""),
    category: str = Query(default=""),
    sort: str = Query(default="newest"),
):
    query = _published_filter()
    search_terms = q.strip()
    category_term = category.strip()

    if search_terms:
        search_regex = re.escape(search_terms)
        search_fields = [
            {"catalog_fields.product_title": {"$regex": search_regex, "$options": "i"}},
            {"catalog_fields.tags": {"$regex": search_regex, "$options": "i"}},
            {"catalog_fields.seo_keywords": {"$regex": search_regex, "$options": "i"}},
            {"filename": {"$regex": search_regex, "$options": "i"}},
            {"analysis.category.value": {"$regex": search_regex, "$options": "i"}},
            {"analysis.category": {"$regex": search_regex, "$options": "i"}},
            {"analysis.subcategory.value": {"$regex": search_regex, "$options": "i"}},
            {"analysis.description.value": {"$regex": search_regex, "$options": "i"}},
            {"analysis.keywords": {"$regex": search_regex, "$options": "i"}},
            {"analysis.brand.value": {"$regex": search_regex, "$options": "i"}},
        ]
    else:
        search_fields = None

    if category_term:
        category_regex = {"$regex": f"^{re.escape(category_term)}$", "$options": "i"}
        clauses = [{"$or": [
            {"analysis.category.value": category_regex},
            {"analysis.category": category_regex},
        ]}]
        if search_fields is not None:
            clauses.append({"$or": search_fields})
        query["$and"] = clauses
    elif search_fields is not None:
        query["$or"] = search_fields

    sort_field = "created_at"
    sort_direction = -1
    if sort != "newest":
        sort_field = "created_at"

    products = [
        _customer_product(product)
        for product in products_collection.find(query).sort(sort_field, sort_direction)
    ]

    return {
        "success": True,
        "products": products,
        "count": len(products),
    }


@router.get("/products/{product_id}")
def get_store_product(product_id: str):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=404, detail="Product not found")

    product = products_collection.find_one(
        {
            "_id": ObjectId(product_id),
            "publication_status": "PUBLISHED",
        }
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return {
        "success": True,
        "product": _customer_product(product),
    }


@router.get("/products/{product_id}/image")
def get_store_product_image(product_id: str, _user=Depends(require_user)):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=404, detail="Product image not found")
    product = products_collection.find_one({"_id": ObjectId(product_id), "publication_status": "PUBLISHED"})
    if not product:
        raise HTTPException(status_code=404, detail="Product image not found")
    filename = product.get("image_filename", "")
    if not filename or Path(filename).name != filename:
        raise HTTPException(status_code=404, detail="Product image not found")
    image_path = (UPLOAD_ROOT / filename).resolve()
    if image_path.parent != UPLOAD_ROOT or not image_path.is_file():
        raise HTTPException(status_code=404, detail="Product image not found")
    return FileResponse(image_path, media_type=mimetypes.guess_type(image_path.name)[0] or "application/octet-stream")
