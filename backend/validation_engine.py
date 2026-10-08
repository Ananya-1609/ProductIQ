# ============================================================
# VALIDATION ENGINE V5
# Category-Aware + Model-Provided Evidence Validation
# ============================================================

from category_normalizer import normalize_category


# ============================================================
# CONFIDENCE THRESHOLDS
# ============================================================

ACCEPT_THRESHOLD = 0.80
REVIEW_THRESHOLD = 0.50


# ============================================================
# CATEGORY-SPECIFIC FIELDS
# ============================================================

CATEGORY_FIELDS = {

    "clothing": [
        "category",
        "subcategory",
        "gender",
        "color",
        "brand",
        "material",
        "closure"
    ],

    "footwear": [
        "category",
        "subcategory",
        "gender",
        "color",
        "brand",
        "material",
        "closure",
        "sole"
    ],

    "bags": [
        "category",
        "subcategory",
        "gender",
        "color",
        "brand",
        "material",
        "closure"
    ],

    "accessories": [
        "category",
        "subcategory",
        "gender",
        "color",
        "brand",
        "material",
        "closure"
    ]
}

# Minimal visual/catalog essentials already represented in each category.
# Optional attributes such as brand and closure may remain UNKNOWN.
REQUIRED_FIELDS = {
    "clothing": {"category", "subcategory", "color", "material"},
    "footwear": {"category", "subcategory", "color", "material", "sole"},
    "bags": {"category", "subcategory", "color", "material"},
    "accessories": {"category", "subcategory", "color", "material"},
}


# ============================================================
# FIELD VALIDATION
# ============================================================

def validate_field(field_name, field_data):

    if not field_data:

        return {
            "field": field_name,
            "status": "UNKNOWN",
            "evidence_type": "UNKNOWN",
            "reason": "Field data is missing"
        }

    # --------------------------------------------------------
    # Read values
    # --------------------------------------------------------

    value = field_data.get(
        "value"
    )

    confidence = field_data.get(
        "confidence",
        0
    )

    evidence_type = field_data.get(
        "evidence_type",
        "UNKNOWN"
    )

    # --------------------------------------------------------
    # Normalize confidence
    # --------------------------------------------------------

    try:

        confidence = float(
            confidence
        )

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

    allowed_evidence_types = {
        "VISUAL",
        "INFERRED",
        "UNKNOWN"
    }

    if evidence_type not in allowed_evidence_types:

        evidence_type = "UNKNOWN"

    # --------------------------------------------------------
    # No value
    # --------------------------------------------------------

    if value is None or value == "":

        return {
            "field": field_name,
            "status": "UNKNOWN",
            "evidence_type": "UNKNOWN",
            "reason": "No reliable value was identified"
        }

    # --------------------------------------------------------
    # UNKNOWN evidence
    # --------------------------------------------------------

    if evidence_type == "UNKNOWN":

        return {
            "field": field_name,
            "status": "REVIEW",
            "evidence_type": "UNKNOWN",
            "reason": (
                "A value was provided, but there is "
                "no reliable supporting evidence"
            )
        }

    # --------------------------------------------------------
    # VISUAL evidence
    # --------------------------------------------------------

    if evidence_type == "VISUAL":

        if confidence >= ACCEPT_THRESHOLD:

            return {
                "field": field_name,
                "status": "ACCEPT",
                "evidence_type": "VISUAL",
                "reason": (
                    f"Confidence is {confidence:.2f} "
                    "with visual evidence"
                )
            }

        if confidence >= REVIEW_THRESHOLD:

            return {
                "field": field_name,
                "status": "REVIEW",
                "evidence_type": "VISUAL",
                "reason": (
                    "Visual evidence exists, but "
                    f"confidence is {confidence:.2f}"
                )
            }

        return {
            "field": field_name,
            "status": "REVIEW",
            "evidence_type": "VISUAL",
            "reason": (
                "Visual evidence exists, but "
                f"confidence is too low ({confidence:.2f})"
            )
        }

    # --------------------------------------------------------
    # INFERRED evidence
    # --------------------------------------------------------

    if evidence_type == "INFERRED":

        return {
            "field": field_name,
            "status": "REVIEW",
            "evidence_type": "INFERRED",
            "reason": (
                "Value is inferred "
                f"(confidence {confidence:.2f})"
            )
        }

    # --------------------------------------------------------
    # Safety fallback
    # --------------------------------------------------------

    return {
        "field": field_name,
        "status": "REVIEW",
        "evidence_type": evidence_type,
        "reason": (
            "Field requires review "
            f"(confidence {confidence:.2f})"
        )
    }


# ============================================================
# PRODUCT VALIDATION
# ============================================================

def validate_product(
    ml_result,
    gemini_result
):

    # ========================================================
    # 1. NORMALIZE ML CATEGORY
    # ========================================================

    ml_category = normalize_category(
        ml_result.get(
            "category"
        )
    )

    # ========================================================
    # 2. NORMALIZE GEMINI CATEGORY
    # ========================================================

    gemini_category_data = (
        gemini_result.get(
            "category",
            {}
        )
    )

    if isinstance(
        gemini_category_data,
        dict
    ):

        gemini_category_value = (
            gemini_category_data.get(
                "value"
            )
        )

    else:

        gemini_category_value = (
            gemini_category_data
        )

    gemini_category = normalize_category(
        gemini_category_value
    )

    # ========================================================
    # 3. CATEGORY AGREEMENT
    # ========================================================

    category_agreement = (
        ml_category != "unknown"
        and
        gemini_category != "unknown"
        and
        ml_category == gemini_category
    )

    # ========================================================
    # 4. CANONICAL CATEGORY
    # ========================================================

    if ml_category != "unknown":

        canonical_category = ml_category

    elif gemini_category != "unknown":

        canonical_category = gemini_category

    else:

        canonical_category = "unknown"

    # ========================================================
    # 5. CATEGORY-SPECIFIC FIELDS
    # ========================================================

    fields_to_validate = CATEGORY_FIELDS.get(
        canonical_category,
        [
            "category",
            "subcategory",
            "gender",
            "color",
            "brand"
        ]
    )
    required_fields = REQUIRED_FIELDS.get(
        canonical_category,
        {"category", "subcategory", "color"},
    )

    # ========================================================
    # 6. VALIDATE FIELDS
    # ========================================================

    field_results = []

    for field_name in fields_to_validate:

        field_data = gemini_result.get(
            field_name
        )

        result = validate_field(
            field_name,
            field_data
        )

        field_results.append(
            result
        )

    # ========================================================
    # 7. REVIEW REASONS
    # ========================================================

    review_reasons = []

    if not category_agreement:

        review_reasons.append(
            "MobileNet and Gemini categories do not agree"
        )

    for result in field_results:

        if result["field"] in required_fields and result["status"] == "UNKNOWN":
            review_reasons.append(
                f"{result['field']}: required analysis is missing or unknown"
            )

        if result["status"] == "REVIEW":

            review_reasons.append(
                f"{result['field']}: "
                f"{result['reason']}"
            )

    # ========================================================
    # 8. OVERALL STATUS
    # ========================================================

    if review_reasons:

        overall_status = "REVIEW"

    else:

        overall_status = "ACCEPT"

    # ========================================================
    # 9. FINAL RESULT
    # ========================================================

    return {

        "overall_status": overall_status,

        "category_validation": {

            "ml_category": ml_category,

            "gemini_category": gemini_category,

            "canonical_category": canonical_category,

            "agreement": category_agreement
        },

        "validated_fields": fields_to_validate,

        "field_validation": field_results,

        "review_reasons": review_reasons
    }
