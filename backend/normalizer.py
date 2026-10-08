CATEGORY_MAP = {
    "footwear": "Footwear",
    "shoes": "Footwear",
    "fashion": "Fashion"
}

SUBCATEGORY_MAP = {
    "sneaker": "Sneakers",
    "sneakers": "Sneakers",
    "sports shoes": "Sneakers",
    "trainers": "Sneakers"
}

CLOSURE_MAP = {
    "lace": "Lace-Up",
    "laces": "Lace-Up",
    "lace-up": "Lace-Up",
    "laced": "Lace-Up"
}

SOLE_MAP = {
    "rubber": "Rubber",
    "rubber sole": "Rubber"
}


def normalize(value, mapping):
    if value is None:
        return None

    key = value.strip().lower()

    return mapping.get(key, value)


def normalize_product(product):

    data = product.model_dump()

    data["category"] = normalize(
        data["category"],
        CATEGORY_MAP
    )

    data["subcategory"] = normalize(
        data["subcategory"],
        SUBCATEGORY_MAP
    )

    data["closure"] = normalize(
        data["closure"],
        CLOSURE_MAP
    )

    data["sole"] = normalize(
        data["sole"],
        SOLE_MAP
    )

    return data