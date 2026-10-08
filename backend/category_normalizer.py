# ============================================================
# CATEGORY NORMALIZER
# ============================================================

CATEGORY_MAP = {
    # Clothing
    "clothing": "clothing",
    "apparel": "clothing",
    "clothes": "clothing",
    "garment": "clothing",
    "fashion clothing": "clothing",

    # Footwear
    "footwear": "footwear",
    "shoes": "footwear",
    "shoe": "footwear",
    "sneakers": "footwear",
    "sandals": "footwear",
    "boots": "footwear",

    # Accessories
    "accessories": "accessories",
    "accessory": "accessories",
    "fashion accessories": "accessories",

    # Bags
    "bags": "bags",
    "bag": "bags",
    "handbag": "bags",
    "backpack": "bags",
    "luggage": "bags",
}


def normalize_category(category: str) -> str:
    """
    Convert different category names into
    the project's canonical category.
    """

    if not category:
        return "unknown"

    normalized = category.strip().lower()

    return CATEGORY_MAP.get(
        normalized,
        "unknown"
    )