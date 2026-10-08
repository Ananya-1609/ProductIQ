import os
import sys
import numpy as np
import tensorflow as tf

# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "product_classifier.keras"
)

IMG_SIZE = (224, 224)

CLASS_NAMES = [
    "accessories",
    "bags",
    "clothing",
    "footwear"
]


# ============================================================
# LOAD MODEL
# ============================================================

print("Loading trained model...")

model = tf.keras.models.load_model(
    MODEL_PATH,
    compile=False
)

print("Model loaded successfully.")
print("Model output shape:", model.output_shape)


# ============================================================
# PREDICTION FUNCTION
# ============================================================

def predict_image(image_path):
    """
    Predict the product category from an image.

    Returns:
        {
            "category": str,
            "confidence": float,
            "probabilities": dict
        }
    """

    if not os.path.exists(image_path):
        raise FileNotFoundError(
            f"Image not found: {image_path}"
        )

    # Load image
    image = tf.keras.utils.load_img(
        image_path,
        target_size=IMG_SIZE
    )

    # Convert image to numpy array
    image_array = tf.keras.utils.img_to_array(image)

    # Add batch dimension
    image_array = np.expand_dims(
        image_array,
        axis=0
    )

    # IMPORTANT:
    # The model already contains the Rescaling layer,
    # so DO NOT divide by 255 here.

    predictions = model.predict(
        image_array,
        verbose=0
    )[0]

    # Get highest probability
    predicted_index = int(
        np.argmax(predictions)
    )

    predicted_category = CLASS_NAMES[
        predicted_index
    ]

    confidence = float(
        predictions[predicted_index] * 100
    )

    probabilities = {
        CLASS_NAMES[i]: round(
            float(predictions[i] * 100),
            2
        )
        for i in range(len(CLASS_NAMES))
    }

    return {
        "category": predicted_category,
        "confidence": round(confidence, 2),
        "probabilities": probabilities
    }


# ============================================================
# COMMAND LINE TEST
# ============================================================

if __name__ == "__main__":

    print()
    print("=" * 60)
    print("PRODUCT IMAGE CLASSIFIER")
    print("=" * 60)

    # Allow image path from command line
    if len(sys.argv) > 1:

        image_path = " ".join(sys.argv[1:])

    else:

        image_path = input(
            "\nEnter image path: "
        ).strip()

    try:

        result = predict_image(
            image_path
        )

        print()
        print("=" * 40)
        print("PREDICTION")
        print("=" * 40)

        print(
            "Image      :",
            image_path
        )

        print(
            "Category   :",
            result["category"]
        )

        print(
            "Confidence :",
            f"{result['confidence']:.2f}%"
        )

        print()
        print("Probabilities:")

        for category, probability in result[
            "probabilities"
        ].items():

            print(
                f"{category:<15} {probability:.2f}%"
            )

    except Exception as e:

        print()
        print("Prediction failed:")
        print(e)