# ============================================================
# REVIEW ENGINE V2
# Evidence-Aware Product Review
# ============================================================


# ============================================================
# CONFIDENCE THRESHOLDS
# ============================================================

ACCEPT_THRESHOLD = 0.80
REVIEW_THRESHOLD = 0.50


# ============================================================
# EVIDENCE TYPES
# ============================================================

ALLOWED_EVIDENCE_TYPES = {
    "VISUAL",
    "INFERRED",
    "UNKNOWN"
}


# ============================================================
# REVIEW ONE ATTRIBUTE
# ============================================================

def get_review_status(
    value,
    confidence,
    evidence_type
):
    """
    Determine the review status of one attribute.

    Rules:

    1. No value
       -> UNKNOWN

    2. UNKNOWN evidence
       -> UNKNOWN

    3. VISUAL + high confidence
       -> ACCEPT

    4. VISUAL + medium confidence
       -> REVIEW

    5. INFERRED
       -> REVIEW

    6. Very low confidence
       -> UNKNOWN
    """

    # --------------------------------------------------------
    # No value
    # --------------------------------------------------------

    if value is None or value == "":
        return "UNKNOWN"

    # --------------------------------------------------------
    # Normalize confidence
    # --------------------------------------------------------

    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        confidence = 0.0

    confidence = max(
        0.0,
        min(1.0, confidence)
    )

    # --------------------------------------------------------
    # Normalize evidence type
    # --------------------------------------------------------

    if isinstance(
        evidence_type,
        str
    ):
        evidence_type = (
            evidence_type
            .strip()
            .upper()
        )
    else:
        evidence_type = "UNKNOWN"

    if evidence_type not in ALLOWED_EVIDENCE_TYPES:
        evidence_type = "UNKNOWN"

    # --------------------------------------------------------
    # UNKNOWN evidence
    # --------------------------------------------------------

    if evidence_type == "UNKNOWN":
        return "UNKNOWN"

    # --------------------------------------------------------
    # INFERRED evidence
    # --------------------------------------------------------

    if evidence_type == "INFERRED":

        if confidence < REVIEW_THRESHOLD:
            return "UNKNOWN"

        return "REVIEW"

    # --------------------------------------------------------
    # VISUAL evidence
    # --------------------------------------------------------

    if evidence_type == "VISUAL":

        if confidence >= ACCEPT_THRESHOLD:
            return "ACCEPT"

        if confidence >= REVIEW_THRESHOLD:
            return "REVIEW"

        return "UNKNOWN"

    # --------------------------------------------------------
    # Safety fallback
    # --------------------------------------------------------

    return "UNKNOWN"


# ============================================================
# REVIEW COMPLETE PRODUCT
# ============================================================

def review_product(product):

    results = {}

    attributes = [
        "category",
        "subcategory",
        "gender",
        "color",
        "brand",
        "material",
        "closure",
        "sole"
    ]

    for attribute in attributes:

        item = getattr(
            product,
            attribute
        )

        # ----------------------------------------------------
        # Determine status
        # ----------------------------------------------------

        status = get_review_status(
            value=item.value,
            confidence=item.confidence,
            evidence_type=item.evidence_type
        )

        # ----------------------------------------------------
        # Store result
        # ----------------------------------------------------

        results[attribute] = {

            "value": item.value,

            "confidence": item.confidence,

            "evidence": item.evidence,

            "evidence_type": item.evidence_type,

            "status": status
        }

    # ========================================================
    # GENERATED PRODUCT INFORMATION
    # ========================================================

    results["description"] = (
        product.description
    )

    results["product_title"] = product.product_title

    results["keywords"] = (
        product.keywords
    )

    results["tags"] = product.tags

    results["seo_keywords"] = product.seo_keywords

    return results
