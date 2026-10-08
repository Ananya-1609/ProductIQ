from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from database import products_collection
from auth import require_reviewer
from product_schema import CatalogFields


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/products",
    tags=["Products"],
    dependencies=[Depends(require_reviewer)]
)


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class ProductCreate(BaseModel):

    filename: str

    analysis: dict[str, Any]

    status: str = "REVIEW"

    image_preview: Optional[str] = None

    # New complete analysis information
    ml_prediction: Optional[dict[str, Any]] = None

    gemini_analysis: Optional[dict[str, Any]] = None

    validation: Optional[dict[str, Any]] = None

    catalog_fields: Optional[CatalogFields] = None


class ProductUpdate(BaseModel):

    analysis: dict[str, Any]

    status: str

    catalog_fields: Optional[CatalogFields] = None


class RejectionRequest(BaseModel):

    reason: str = Field(min_length=1)


# ============================================================
# HELPER
# ============================================================

def serialize_product(product):

    analysis = product.get("analysis", {}) or {}
    catalog = product.get("catalog_fields", {}) or {}
    catalog_fields = {
        "product_title": catalog.get("product_title") or product.get("product_title") or analysis.get("product_title") or "",
        "price": catalog.get("price", product.get("price")),
        "sizes": catalog.get("sizes", product.get("sizes", [])) or [],
        "tags": catalog.get("tags", product.get("tags", analysis.get("tags", []))) or [],
        "seo_keywords": catalog.get("seo_keywords", product.get("seo_keywords", analysis.get("seo_keywords", analysis.get("keywords", [])))) or [],
    }

    return {
        "id": str(product["_id"]),

        "filename": product.get(
            "filename"
        ),

        "analysis": product.get(
            "analysis",
            {}
        ),

        "catalog_fields": catalog_fields,

        "ml_prediction": product.get(
            "ml_prediction",
            {}
        ),

        "gemini_analysis": product.get(
            "gemini_analysis",
            {}
        ),

        "validation": product.get(
            "validation",
            {}
        ),

        "status": product.get(
            "status",
            "REVIEW"
        ),

        "publication_status": product.get(
            "publication_status",
            "DRAFT"
        ),

        "created_at": product.get(
            "created_at"
        ),

        "updated_at": product.get(
            "updated_at"
        ),

        "image_url": (
            f"/api/products/{product['_id']}/image"
            if product.get("image_filename")
            else product.get("image_url")
        )
    }


def _get_product_or_404(product_id):

    if not ObjectId.is_valid(product_id):

        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    product = products_collection.find_one(
        {"_id": ObjectId(product_id)}
    )

    if not product:

        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return product


def _reviewer_identity(user):

    return {
        "google_sub": user.get("google_sub"),
        "email": user.get("email")
    }


# ============================================================
# CREATE PRODUCT
# ============================================================

@router.post("")
def create_product(
    product: ProductCreate
):

    now = datetime.now(
        timezone.utc
    )
    analysis = product.analysis or {}
    catalog_fields = product.catalog_fields.model_dump() if product.catalog_fields else {
        "product_title": analysis.get("product_title") or "",
        "price": None,
        "sizes": [],
        "tags": analysis.get("tags") or [],
        "seo_keywords": analysis.get("seo_keywords") or analysis.get("keywords") or [],
    }

    document = {

        "filename": product.filename,

        "analysis": product.analysis,

        "ml_prediction": (
            product.ml_prediction
            or {}
        ),

        "gemini_analysis": (
            product.gemini_analysis
            or {}
        ),

        "validation": (
            product.validation
            or {}
        ),

        "catalog_fields": catalog_fields,

        "status": product.status,

        "publication_status": "PENDING_REVIEW",

        "created_at": now,

        "updated_at": now
    }

    result = products_collection.insert_one(
        document
    )

    return {

        "success": True,

        "product_id": str(
            result.inserted_id
        ),

        "message": (
            "Product saved successfully"
        )
    }


# ============================================================
# GET ALL PRODUCTS
# ============================================================

@router.get("")
def get_products():

    products = []

    cursor = products_collection.find().sort(
        "created_at",
        -1
    )

    for product in cursor:

        products.append(
            serialize_product(product)
        )

    return {

        "success": True,

        "products": products,

        "count": len(products)
    }


# ============================================================
# GET SINGLE PRODUCT
# ============================================================

@router.get("/{product_id}")
def get_product(
    product_id: str
):

    if not ObjectId.is_valid(
        product_id
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid product ID"
        )

    product = products_collection.find_one(
        {
            "_id": ObjectId(
                product_id
            )
        }
    )

    if not product:

        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return {

        "success": True,

        "product": serialize_product(
            product
        )
    }


# ============================================================
# UPDATE PRODUCT
# ============================================================

@router.put("/{product_id}")
def update_product(
    product_id: str,
    product: ProductUpdate
):

    if not ObjectId.is_valid(
        product_id
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid product ID"
        )

    updates = {
        "analysis": product.analysis,
        "status": product.status,
        "updated_at": datetime.now(timezone.utc),
    }
    if product.catalog_fields is not None:
        updates["catalog_fields"] = product.catalog_fields.model_dump()
    result = products_collection.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": updates},
    )

    if result.matched_count == 0:

        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return {

        "success": True,

        "message": (
            "Product updated successfully"
        )
    }


@router.post("/{product_id}/approve")
def approve_product(
    product_id: str,
    reviewer=Depends(require_reviewer)
):

    product = _get_product_or_404(product_id)
    current_state = product.get("publication_status", "DRAFT")

    if current_state not in {"DRAFT", "PENDING_REVIEW"}:

        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot approve product from {current_state}"
            )
        )

    now = datetime.now(timezone.utc)
    updated = products_collection.update_one(
        {"_id": product["_id"]},
        {
            "$set": {
                "publication_status": "APPROVED",
                "updated_at": now,
                "reviewed_at": now,
                "reviewed_by": _reviewer_identity(reviewer)
            }
        }
    )

    return {
        "success": updated.matched_count == 1,
        "product": serialize_product(
            products_collection.find_one({"_id": product["_id"]})
        )
    }


@router.post("/{product_id}/reject")
def reject_product(
    product_id: str,
    rejection: RejectionRequest,
    reviewer=Depends(require_reviewer)
):

    product = _get_product_or_404(product_id)
    current_state = product.get("publication_status", "DRAFT")

    if current_state not in {"DRAFT", "PENDING_REVIEW"}:

        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot reject product from {current_state}"
            )
        )

    reason = rejection.reason.strip()

    if not reason:

        raise HTTPException(
            status_code=422,
            detail="Rejection reason is required"
        )

    now = datetime.now(timezone.utc)
    product_update = products_collection.update_one(
        {"_id": product["_id"]},
        {
            "$set": {
                "publication_status": "REJECTED",
                "rejection_reason": reason,
                "updated_at": now,
                "reviewed_at": now,
                "reviewed_by": _reviewer_identity(reviewer)
            }
        }
    )

    return {
        "success": product_update.matched_count == 1,
        "product": serialize_product(
            products_collection.find_one({"_id": product["_id"]})
        )
    }


@router.post("/{product_id}/publish")
def publish_product(
    product_id: str,
    reviewer=Depends(require_reviewer)
):

    product = _get_product_or_404(product_id)

    if product.get("publication_status", "DRAFT") != "APPROVED":

        raise HTTPException(
            status_code=409,
            detail="Only approved products can be published"
        )

    now = datetime.now(timezone.utc)
    product_update = products_collection.update_one(
        {"_id": product["_id"]},
        {
            "$set": {
                "publication_status": "PUBLISHED",
                "published_at": now,
                "published_by": _reviewer_identity(reviewer),
                "updated_at": now
            }
        }
    )

    return {
        "success": product_update.matched_count == 1,
        "product": serialize_product(
            products_collection.find_one({"_id": product["_id"]})
        )
    }


@router.post("/{product_id}/unpublish")
def unpublish_product(
    product_id: str,
    reviewer=Depends(require_reviewer)
):

    product = _get_product_or_404(product_id)

    if product.get("publication_status", "DRAFT") != "PUBLISHED":

        raise HTTPException(
            status_code=409,
            detail="Only published products can be unpublished"
        )

    now = datetime.now(timezone.utc)
    product_update = products_collection.update_one(
        {"_id": product["_id"]},
        {
            "$set": {
                "publication_status": "APPROVED",
                "unpublished_at": now,
                "unpublished_by": _reviewer_identity(reviewer),
                "updated_at": now
            }
        }
    )

    return {
        "success": product_update.matched_count == 1,
        "product": serialize_product(
            products_collection.find_one({"_id": product["_id"]})
        )
    }
