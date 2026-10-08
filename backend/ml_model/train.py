import os
import numpy as np
import tensorflow as tf

from model import build_model


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

DATASET_DIR = os.path.join(
    BASE_DIR,
    "dataset"
)

TRAIN_DIR = os.path.join(
    DATASET_DIR,
    "train"
)

VALIDATION_DIR = os.path.join(
    DATASET_DIR,
    "validation"
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "models"
)

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "product_classifier.keras"
)


# ============================================================
# SETTINGS
# ============================================================

IMG_SIZE = (224, 224)
BATCH_SIZE = 32

# Phase 1
INITIAL_EPOCHS = 5

# Phase 2
FINE_TUNE_EPOCHS = 10


# ============================================================
# LOAD DATASET
# ============================================================

print("Loading training dataset...")

train_dataset = tf.keras.utils.image_dataset_from_directory(
    TRAIN_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=True,
    seed=42
)

print("\nLoading validation dataset...")

validation_dataset = tf.keras.utils.image_dataset_from_directory(
    VALIDATION_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=False
)


# ============================================================
# CLASSES
# ============================================================

class_names = train_dataset.class_names

print("\nClasses:")
print(class_names)

NUM_CLASSES = len(class_names)

if NUM_CLASSES != 4:
    raise ValueError(
        f"Expected 4 classes but found {NUM_CLASSES}: "
        f"{class_names}"
    )


# ============================================================
# PERFORMANCE
# ============================================================

AUTOTUNE = tf.data.AUTOTUNE

train_dataset = train_dataset.prefetch(
    buffer_size=AUTOTUNE
)

validation_dataset = validation_dataset.prefetch(
    buffer_size=AUTOTUNE
)


# ============================================================
# CLASS WEIGHTS
# ============================================================

# Training distribution from your prepared dataset:
#
# accessories = 5753
# bags        = 2139
# clothing    = 14974
# footwear    = 6453

class_counts = np.array([
    5753,   # accessories
    2139,   # bags
    14974,  # clothing
    6453    # footwear
])

total_samples = np.sum(class_counts)

class_weights = {}

for class_index, count in enumerate(class_counts):

    class_weights[class_index] = (
        total_samples /
        (NUM_CLASSES * count)
    )

print("\nClass weights:")

for index, weight in class_weights.items():

    print(
        f"{class_names[index]:12s}: "
        f"{weight:.4f}"
    )


# ============================================================
# BUILD MODEL
# ============================================================

print("\nBuilding ML model...")

model = build_model()

model.summary()


# ============================================================
# CALLBACKS
# ============================================================

checkpoint = tf.keras.callbacks.ModelCheckpoint(
    MODEL_PATH,
    monitor="val_accuracy",
    save_best_only=True,
    mode="max",
    verbose=1
)

early_stopping = tf.keras.callbacks.EarlyStopping(
    monitor="val_accuracy",
    patience=3,
    mode="max",
    restore_best_weights=True,
    verbose=1
)


# ============================================================
# PHASE 1 — TRAIN CLASSIFIER
# ============================================================

print("\n======================================")
print("PHASE 1: TRAINING CLASSIFIER")
print("======================================")

history = model.fit(
    train_dataset,
    validation_data=validation_dataset,
    epochs=INITIAL_EPOCHS,
    class_weight=class_weights,
    callbacks=[
        checkpoint,
        early_stopping
    ]
)


# ============================================================
# PHASE 2 — FINE TUNING
# ============================================================

print("\n======================================")
print("PHASE 2: FINE-TUNING MOBILENETV2")
print("======================================")


# Find MobileNetV2 inside Sequential model
base_model = None

for layer in model.layers:

    if isinstance(
        layer,
        tf.keras.Model
    ):

        base_model = layer
        break


if base_model is None:
    raise RuntimeError(
        "Could not find MobileNetV2 base model."
    )


# Unfreeze MobileNetV2
base_model.trainable = True


# Freeze the first ~100 layers.
# Fine-tune only the later layers.
for layer in base_model.layers[:-40]:

    layer.trainable = False


# Recompile with a LOW learning rate.
model.compile(
    optimizer=tf.keras.optimizers.Adam(
        learning_rate=1e-5
    ),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)


model.summary()


# ============================================================
# FINE-TUNE
# ============================================================

history_fine = model.fit(
    train_dataset,
    validation_data=validation_dataset,
    epochs=FINE_TUNE_EPOCHS,
    class_weight=class_weights,
    callbacks=[
        checkpoint,
        early_stopping
    ]
)


# ============================================================
# LOAD BEST MODEL
# ============================================================

print("\nLoading best saved model...")

best_model = tf.keras.models.load_model(
    MODEL_PATH,
    compile=False
)


# ============================================================
# SAVE FINAL MODEL
# ============================================================

best_model.save(
    MODEL_PATH
)


# ============================================================
# COMPLETE
# ============================================================

print("\n======================================")
print("ML MODEL TRAINING COMPLETE")
print("======================================")

print(
    f"\nModel saved at:\n{MODEL_PATH}"
)

print(
    "\nClasses:"
)

for index, name in enumerate(class_names):

    print(
        f"{index} -> {name}"
    )