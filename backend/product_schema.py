from pydantic import BaseModel, Field
from typing import Optional


class Product(BaseModel):
    category: str
    subcategory: str
    gender: str
    color: str

    brand: Optional[str] = None
    material: Optional[str] = None
    closure: Optional[str] = None
    sole: Optional[str] = None

    description: Optional[str] = None
    keywords: list[str] = Field(default_factory=list)


class CatalogFields(BaseModel):
    product_title: str = ""
    price: Optional[float] = Field(default=None, ge=0)
    sizes: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    seo_keywords: list[str] = Field(default_factory=list)
