import os
import json
import time
import logging
import mimetypes

from dotenv import load_dotenv
from google import genai
from google.genai import types

from review_engine import review_product
from confidence_schema import ProductAnalysis

logger = logging.getLogger(__name__)


# ============================================================
# 1. LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError(
        "GEMINI_API_KEY not found"
    )


# ============================================================
# 2. CREATE GEMINI CLIENT
# ============================================================

client = genai.Client(
    api_key=api_key
)


# ============================================================
# 3. MODEL
# ============================================================

MODEL_NAME = "gemini-3.5-flash-lite"


# ============================================================
# 4. CLEAN JSON RESPONSE
# ============================================================

def clean_json_response(text):

    if not text:
        raise ValueError(
            "Gemini returned an empty response."
        )

    text = text.strip()

    # Remove Markdown JSON fences
    if text.startswith("```json"):
        text = text[7:]

    elif text.startswith("```"):
        text = text[3:]

    if text.endswith("```"):
        text = text[:-3]

    return text.strip()


# ============================================================
# 5. GEMINI PROMPT
# ============================================================

PRODUCT_ANALYSIS_PROMPT = """
Analyze the provided e-commerce product image.

Return ONLY valid JSON.

The product belongs to one of these broad categories:

- Clothing
- Footwear
- Accessories
- Bags


============================================================
EVIDENCE TYPES
============================================================

For every attribute, return:

{
  "value": "...",
  "confidence": 0.0,
  "evidence": "...",
  "evidence_type": "VISUAL"
}

Allowed evidence_type values are ONLY:

- VISUAL
- INFERRED
- UNKNOWN


============================================================
1. VISUAL
============================================================

Use VISUAL only when the image directly provides evidence.

Examples:

- A clearly visible brand logo
- Clearly visible product color
- Visible zipper
- Visible buttons
- Visible shoelaces
- Visible straps
- Clearly visible product shape
- Clearly visible printed text


============================================================
2. INFERRED
============================================================

Use INFERRED when the value is suggested by appearance
but cannot be directly confirmed.

Examples:

- Material inferred from fabric appearance
- Product usage inferred from design
- A characteristic inferred from common product conventions


============================================================
3. UNKNOWN
============================================================

Use UNKNOWN when the image does not provide enough reliable
evidence.

When UNKNOWN, use:

"value": null,
"confidence": 0.0,
"evidence": "The attribute cannot be reliably determined from the image.",
"evidence_type": "UNKNOWN"


============================================================
GENERAL RULES
============================================================

DO NOT invent information.

Do not turn assumptions into facts.

Confidence represents how confident you are in the extracted
attribute.

Evidence must explain WHY the value was selected.

Evidence_type must describe the type of evidence actually
supporting the value.


============================================================
IMPORTANT GENDER RULE
============================================================

The "gender" field means PRODUCT TARGET GENDER.

Do NOT determine product target gender merely from the gender
or appearance of a person/model wearing the product.

Example:

A male model wearing a shirt does NOT prove that the shirt
is a men's product.

Only identify product target gender when there is reliable
evidence from:

- visible product labeling
- explicit text
- product-specific design
- reliable contextual information

Otherwise return:

"value": null,
"confidence": 0.0,
"evidence": "Product target gender cannot be reliably determined from the image.",
"evidence_type": "UNKNOWN"


============================================================
IMPORTANT MATERIAL RULE
============================================================

Do not automatically assume:

- cotton
- leather
- polyester
- denim
- wool
- synthetic material

just because that material is common for the product.

If the material is only suggested by appearance:

evidence_type = "INFERRED"

If there is insufficient evidence:

evidence_type = "UNKNOWN"


============================================================
PRODUCT ATTRIBUTES
============================================================

Return product_title as a concise, useful catalog title using only supported
attributes. Do not invent a brand, size, material, or other specification.

Return:

category
subcategory
gender
color
brand
material
closure
sole


============================================================
DESCRIPTION AND KEYWORDS
============================================================

Also generate:

description

A concise e-commerce product description based only on
information supported by the image.

keywords

A list of relevant search/catalog keywords.

tags

A separate short list of concise product tags.

seo_keywords

A separate list of relevant searchable SEO phrases. Do not include price or
unsupported specifications.


============================================================
REQUIRED JSON STRUCTURE
============================================================

{
  "product_title": "...",
  "category": {
    "value": "...",
    "confidence": 0.0,
    "evidence": "...",
    "evidence_type": "VISUAL"
  },

  "subcategory": {
    "value": "...",
    "confidence": 0.0,
    "evidence": "...",
    "evidence_type": "VISUAL"
  },

  "gender": {
    "value": null,
    "confidence": 0.0,
    "evidence": "...",
    "evidence_type": "UNKNOWN"
  },

  "color": {
    "value": "...",
    "confidence": 0.0,
    "evidence": "...",
    "evidence_type": "VISUAL"
  },

  "brand": {
    "value": null,
    "confidence": 0.0,
    "evidence": "...",
    "evidence_type": "UNKNOWN"
  },

  "material": {
    "value": null,
    "confidence": 0.0,
    "evidence": "...",
    "evidence_type": "UNKNOWN"
  },

  "closure": {
    "value": null,
    "confidence": 0.0,
    "evidence": "...",
    "evidence_type": "UNKNOWN"
  },

  "sole": {
    "value": null,
    "confidence": 0.0,
    "evidence": "...",
    "evidence_type": "UNKNOWN"
  },

  "description": "...",

  "keywords": [],

  "tags": [],

  "seo_keywords": []
}


============================================================
FINAL RULE
============================================================

Return ONLY JSON.

Do not return Markdown.

Do not return explanations outside the JSON.
"""


# ============================================================
# 6. ANALYZE PRODUCT
# ============================================================

def analyze_product(image_path, mime_type=None):

    # --------------------------------------------------------
    # Read image
    # --------------------------------------------------------

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    # --------------------------------------------------------
    # Send request
    # --------------------------------------------------------

    if mime_type is None:
        mime_type = mimetypes.guess_type(image_path)[0]
    if mime_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise ValueError("A supported validated image MIME type is required")

    # --------------------------------------------------------
    # Gemini request with retry for temporary service failures
    # --------------------------------------------------------
    max_retries = 3
    retry_delays = [2, 4, 8]

    response = None

    for attempt in range(max_retries + 1):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=[
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type=mime_type
                    ),
                    PRODUCT_ANALYSIS_PROMPT
                ]
            )
            break

        except Exception as e:
            error_text = str(e)

            # Retry only temporary Gemini availability/server errors.
            is_temporary_error = (
                "503" in error_text
                or "UNAVAILABLE" in error_text
                or "high demand" in error_text
                or "500" in error_text
                or "INTERNAL" in error_text
            )

            if not is_temporary_error or attempt >= max_retries:
                raise

            delay = retry_delays[attempt]

            logger.warning("Gemini temporary failure; retry %s/%s after %s seconds", attempt + 1, max_retries, delay)

            time.sleep(delay)

    if response is None:
        raise RuntimeError("Gemini did not return a response.")

    cleaned_response = clean_json_response(
        response.text
    )

    # ========================================================
    # VALIDATE WITH PYDANTIC
    # ========================================================

    product = ProductAnalysis.model_validate_json(
        cleaned_response
    )

    # ========================================================
    # REVIEW ENGINE
    # ========================================================

    reviewed = review_product(
        product
    )
    logger.info("Gemini product analysis completed")

    # ========================================================
    # RETURN RESULT
    # ========================================================

    return reviewed


# ============================================================
# 7. DIRECT TEST
# ============================================================

if __name__ == "__main__":

    analyze_product("product.jpg")
