from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


# ============================================================
# ATTRIBUTE VALUE
# ============================================================

class AttributeValue(BaseModel):
    """
    Represents one AI-extracted product attribute.
    """

    value: Optional[str] = None

    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0
    )

    evidence: str = ""

    evidence_type: str = "UNKNOWN"

    @field_validator("evidence_type")
    @classmethod
    def validate_evidence_type(cls, value):
        value = value.strip().upper()

        allowed = {
            "VISUAL",
            "INFERRED",
            "UNKNOWN"
        }

        if value not in allowed:
            raise ValueError(
                "evidence_type must be "
                "VISUAL, INFERRED, or UNKNOWN"
            )

        return value


# ============================================================
# PRODUCT ANALYSIS
# ============================================================

class ProductAnalysis(BaseModel):

    product_title: str = ""

    category: AttributeValue

    subcategory: AttributeValue

    gender: AttributeValue

    color: AttributeValue

    brand: AttributeValue

    material: AttributeValue

    closure: AttributeValue

    sole: AttributeValue

    description: str = ""

    keywords: List[str] = []

    tags: List[str] = []

    seo_keywords: List[str] = []
