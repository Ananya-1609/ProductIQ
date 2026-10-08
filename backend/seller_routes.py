from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import require_seller
from database import products_collection
from product_routes import serialize_product
from product_schema import CatalogFields


router = APIRouter(
    prefix="/seller",
    tags=["Seller"],
    dependencies=[Depends(require_seller)],
)


class SellerProductUpdate(BaseModel):
    analysis: dict[str, Any]
    status: str
    catalog_fields: CatalogFields | None = None


def _owned_product_or_404(product_id: str, seller) -> dict:
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=404, detail="Product not found")
    product = products_collection.find_one({
        "_id": ObjectId(product_id),
        "owner_google_sub": seller.get("google_sub"),
    })
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("/products")
def get_seller_products(seller=Depends(require_seller)):
    products = [
        serialize_product(product)
        for product in products_collection.find({
            "owner_google_sub": seller.get("google_sub"),
        }).sort("created_at", -1)
    ]
    return {"success": True, "products": products, "count": len(products)}


@router.get("/products/{product_id}")
def get_seller_product(product_id: str, seller=Depends(require_seller)):
    return {"success": True, "product": serialize_product(_owned_product_or_404(product_id, seller))}


@router.put("/products/{product_id}")
def update_seller_product(product_id: str, product: SellerProductUpdate, seller=Depends(require_seller)):
    owned = _owned_product_or_404(product_id, seller)
    updates = {"analysis": product.analysis, "status": product.status, "updated_at": datetime.now(timezone.utc)}
    if product.catalog_fields is not None:
        updates["catalog_fields"] = product.catalog_fields.model_dump()

    # Any seller change to approved/public data invalidates the review. Keep
    # drafts and items already awaiting review in their current workflow state.
    current_state = owned.get("publication_status", "DRAFT")
    if current_state in {"APPROVED", "PUBLISHED"}:
        updates.update({
            "publication_status": "PENDING_REVIEW",
            "reviewed_at": None,
            "reviewed_by": None,
            "published_at": None,
            "published_by": None,
            "rejection_reason": None,
            "unpublished_at": None,
            "unpublished_by": None,
        })

    update_filter = {"_id": owned["_id"], "owner_google_sub": seller.get("google_sub")}
    update_filter["publication_status"] = (
        owned["publication_status"]
        if "publication_status" in owned
        else {"$exists": False}
    )
    result = products_collection.update_one(
        update_filter,
        {"$set": updates},
    )
    if result.matched_count != 1:
        raise HTTPException(status_code=409, detail="Product workflow changed; reload and try again")
    return {"success": True, "product": serialize_product(products_collection.find_one({"_id": owned["_id"]}))}
