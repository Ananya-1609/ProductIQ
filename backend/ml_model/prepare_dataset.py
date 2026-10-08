import os
import shutil
import pandas as pd
from sklearn.model_selection import train_test_split


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Actual Myntra dataset
DATASET_DIR = os.path.join(
    BASE_DIR,
    "data",
    "myntradataset"
)

IMAGE_DIR = os.path.join(
    DATASET_DIR,
    "images"
)

CSV_PATH = os.path.join(
    DATASET_DIR,
    "styles.csv"
)

# Output ML dataset
OUTPUT_DIR = os.path.join(
    BASE_DIR,
    "dataset"
)


# ============================================================
# CATEGORY NAMES
# ============================================================

CATEGORIES = [
    "accessories",
    "bags",
    "clothing",
    "footwear"
]


# ============================================================
# CATEGORY MAPPING
# ============================================================

def get_category(row):
    """
    Convert Myntra masterCategory/subCategory
    into our ML categories.
    """

    master = str(row["masterCategory"]).strip()
    sub = str(row["subCategory"]).strip()

    # Footwear
    if master == "Footwear":
        return "footwear"

    # Apparel
    if master == "Apparel":
        return "clothing"

    # Myntra stores Bags under Accessories
    if master == "Accessories" and sub.lower() == "bags":
        return "bags"

    # Remaining Accessories
    if master == "Accessories":
        return "accessories"

    return None


# ============================================================
# CHECK PATHS
# ============================================================

print("Checking dataset paths...")

print("\nCSV:")
print(CSV_PATH)

print("\nImages:")
print(IMAGE_DIR)


if not os.path.exists(CSV_PATH):
    raise FileNotFoundError(
        f"\nstyles.csv not found at:\n{CSV_PATH}"
    )


if not os.path.exists(IMAGE_DIR):
    raise FileNotFoundError(
        f"\nImages folder not found at:\n{IMAGE_DIR}"
    )


# ============================================================
# LOAD CSV
# ============================================================

print("\nLoading styles.csv...")

df = pd.read_csv(
    CSV_PATH,
    on_bad_lines="skip"
)

print(
    f"Total products in CSV: {len(df)}"
)

print("\nColumns found:")
print(df.columns.tolist())


# ============================================================
# CHECK REQUIRED COLUMNS
# ============================================================

required_columns = [
    "id",
    "masterCategory",
    "subCategory"
]

for column in required_columns:

    if column not in df.columns:

        raise Exception(
            f"\nRequired column '{column}' "
            f"was not found in styles.csv"
        )


# ============================================================
# CREATE OUR CATEGORY COLUMN
# ============================================================

print("\nMapping Myntra categories...")

df["category"] = df.apply(
    get_category,
    axis=1
)


# Remove products that don't belong
# to our four target categories
df = df[
    df["category"].notna()
].copy()


print(
    f"\nProducts belonging to our categories: "
    f"{len(df)}"
)


# ============================================================
# SHOW CATEGORY DISTRIBUTION BEFORE IMAGES
# ============================================================

print("\nCategory distribution before image check:")

print(
    df["category"].value_counts()
)


# ============================================================
# FIND AVAILABLE IMAGES
# ============================================================

print("\nChecking images...")

valid_data = []

missing_images = 0

for _, row in df.iterrows():

    product_id = str(
        row["id"]
    ).strip()

    image_path = os.path.join(
        IMAGE_DIR,
        product_id + ".jpg"
    )

    if os.path.exists(image_path):

        valid_data.append({
            "id": product_id,
            "category": row["category"],
            "image": image_path
        })

    else:

        missing_images += 1


print(
    f"Images found: {len(valid_data)}"
)

print(
    f"Images missing: {missing_images}"
)


if len(valid_data) == 0:

    raise Exception(
        "\nNo matching images were found."
    )


# ============================================================
# CREATE DATAFRAME
# ============================================================

data = pd.DataFrame(
    valid_data
)


# ============================================================
# FINAL CATEGORY DISTRIBUTION
# ============================================================

print("\nFinal category distribution:")

print(
    data["category"].value_counts()
)


# ============================================================
# CHECK THAT ALL 4 CLASSES EXIST
# ============================================================

missing_categories = [
    category
    for category in CATEGORIES
    if category not in data["category"].unique()
]


if missing_categories:

    raise Exception(
        "\nThe following categories have no images:\n"
        + "\n".join(missing_categories)
    )


# ============================================================
# SPLIT DATA
# ============================================================

print("\nSplitting dataset...")

train_data, temp_data = train_test_split(
    data,
    test_size=0.30,
    random_state=42,
    stratify=data["category"]
)


validation_data, test_data = train_test_split(
    temp_data,
    test_size=0.50,
    random_state=42,
    stratify=temp_data["category"]
)


print("\nDataset split:")

print(
    f"Training: {len(train_data)}"
)

print(
    f"Validation: {len(validation_data)}"
)

print(
    f"Testing: {len(test_data)}"
)


# ============================================================
# SHOW SPLIT DISTRIBUTION
# ============================================================

print("\nTraining distribution:")
print(
    train_data["category"].value_counts()
)

print("\nValidation distribution:")
print(
    validation_data["category"].value_counts()
)

print("\nTesting distribution:")
print(
    test_data["category"].value_counts()
)


# ============================================================
# REMOVE OLD OUTPUT DATASET
# ============================================================

if os.path.exists(OUTPUT_DIR):

    print(
        "\nRemoving old generated dataset..."
    )

    shutil.rmtree(
        OUTPUT_DIR
    )


# ============================================================
# CREATE FOLDERS
# ============================================================

print("\nCreating dataset folders...")


for split_name in [
    "train",
    "validation",
    "test"
]:

    for category in CATEGORIES:

        folder = os.path.join(
            OUTPUT_DIR,
            split_name,
            category
        )

        os.makedirs(
            folder,
            exist_ok=True
        )


# ============================================================
# COPY IMAGES
# ============================================================

print("\nCopying images...")


for split_name, split_data in [
    ("train", train_data),
    ("validation", validation_data),
    ("test", test_data)
]:

    print(
        f"\nPreparing {split_name} dataset..."
    )

    for _, row in split_data.iterrows():

        destination = os.path.join(
            OUTPUT_DIR,
            split_name,
            row["category"],
            row["id"] + ".jpg"
        )

        shutil.copy2(
            row["image"],
            destination
        )


# ============================================================
# COMPLETE
# ============================================================

print("\n======================================")
print("DATASET PREPARATION COMPLETE")
print("======================================")


print(
    f"\nDataset location:\n{OUTPUT_DIR}"
)


print("\nFinal structure:")

print("""
dataset/
│
├── train/
│   ├── accessories/
│   ├── bags/
│   ├── clothing/
│   └── footwear/
│
├── validation/
│   ├── accessories/
│   ├── bags/
│   ├── clothing/
│   └── footwear/
│
└── test/
    ├── accessories/
    ├── bags/
    ├── clothing/
    └── footwear/
""")