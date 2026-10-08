from pydantic import BaseModel
from typing import Optional


class ProductAttributes(BaseModel):
    category: str
    subcategory: str
    gender: str
    color: str
    brand: Optional[str] = None
    material: Optional[str] = None
    closure: str
    sole: str