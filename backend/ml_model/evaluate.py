"""Offline evaluation for the existing ProductIQ image classifier.

This module evaluates only the prepared test split. It loads the saved model
directly so importing or running it never retrains the classifier or calls any
production analysis services.
"""

import csv
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)


BASE_DIR = Path(__file__).resolve().parent
TEST_DIR = BASE_DIR / "dataset" / "test"
MODEL_PATH = BASE_DIR / "models" / "product_classifier.keras"
RESULTS_PATH = BASE_DIR / "evaluation_results.json"
REPORT_PATH = BASE_DIR / "evaluation_report.json"
PREDICTIONS_PATH = BASE_DIR / "evaluation_predictions.csv"
CONFUSION_MATRIX_PATH = BASE_DIR / "confusion_matrix.png"

CLASS_NAMES = [
    "accessories",
    "bags",
    "clothing",
    "footwear",
]
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
SUPPORTED_EXTENSIONS = {".bmp", ".gif", ".jpeg", ".jpg", ".png"}


def _test_file_paths():
    paths = []
    for class_name in CLASS_NAMES:
        class_dir = TEST_DIR / class_name
        if not class_dir.is_dir():
            raise FileNotFoundError(f"Missing test class directory: {class_dir}")
        paths.extend(
            sorted(
                path
                for path in class_dir.iterdir()
                if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
            )
        )
    return paths


def _load_test_dataset():
    dataset = tf.keras.utils.image_dataset_from_directory(
        TEST_DIR,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        shuffle=False,
        class_names=CLASS_NAMES,
    )
    return dataset


def _confidence_buckets(confidences, correct):
    bucket_ranges = [
        (0.0, 0.5, "0.0 - 0.5"),
        (0.5, 0.6, "0.5 - 0.6"),
        (0.6, 0.7, "0.6 - 0.7"),
        (0.7, 0.8, "0.7 - 0.8"),
        (0.8, 0.9, "0.8 - 0.9"),
        (0.9, 1.0, "0.9 - 1.0"),
    ]
    results = []
    for lower, upper, label in bucket_ranges:
        if upper == 1.0:
            mask = (confidences >= lower) & (confidences <= upper)
        else:
            mask = (confidences >= lower) & (confidences < upper)
        sample_count = int(mask.sum())
        results.append(
            {
                "confidence_bucket": label,
                "sample_count": sample_count,
                "accuracy": float(correct[mask].mean()) if sample_count else 0.0,
            }
        )
    return results


def _save_confusion_matrix(matrix):
    figure, axis = plt.subplots(figsize=(8, 7))
    image = axis.imshow(matrix, interpolation="nearest", cmap="Blues")
    figure.colorbar(image, ax=axis)
    axis.set(
        xticks=np.arange(len(CLASS_NAMES)),
        yticks=np.arange(len(CLASS_NAMES)),
        xticklabels=CLASS_NAMES,
        yticklabels=CLASS_NAMES,
        ylabel="True class",
        xlabel="Predicted class",
        title="ProductIQ MobileNetV2 confusion matrix",
    )
    axis.set_ylim(len(CLASS_NAMES) - 0.5, -0.5)
    threshold = matrix.max() / 2.0 if matrix.size else 0
    for row in range(matrix.shape[0]):
        for column in range(matrix.shape[1]):
            axis.text(
                column,
                row,
                int(matrix[row, column]),
                ha="center",
                va="center",
                color="white" if matrix[row, column] > threshold else "black",
            )
    figure.tight_layout()
    figure.savefig(CONFUSION_MATRIX_PATH, dpi=160)
    plt.close(figure)


def _print_report(results, high_confidence_errors):
    print("ProductIQ Model Evaluation")
    print("==========================")
    print(f"\nTest samples: {results['test_samples']}")
    print(f"\nAccuracy: {results['accuracy'] * 100:.2f}%")
    print(f"\nMacro Precision: {results['macro_precision'] * 100:.2f}%")
    print(f"Macro Recall: {results['macro_recall'] * 100:.2f}%")
    print(f"Macro F1: {results['macro_f1'] * 100:.2f}%")
    print(f"\nWeighted Precision: {results['weighted_precision'] * 100:.2f}%")
    print(f"Weighted Recall: {results['weighted_recall'] * 100:.2f}%")
    print(f"Weighted F1: {results['weighted_f1'] * 100:.2f}%")

    print("\nPer-class results:")
    for class_name in CLASS_NAMES:
        metrics = results["classes"][class_name]
        print(f"\n{class_name}")
        print(f"Precision: {metrics['precision'] * 100:.2f}%")
        print(f"Recall: {metrics['recall'] * 100:.2f}%")
        print(f"F1: {metrics['f1'] * 100:.2f}%")
        print(f"Support: {metrics['support']}")

    print("\nConfidence bucket analysis")
    print("--------------------------")
    print("confidence_bucket | sample_count | accuracy")
    for bucket in results["confidence_buckets"]:
        print(
            f"{bucket['confidence_bucket']:17s} | "
            f"{bucket['sample_count']:12d} | "
            f"{bucket['accuracy'] * 100:.2f}%"
        )

    print("\nTest-set distribution")
    print("---------------------")
    for class_name, metrics in results["classes"].items():
        print(
            f"{class_name:12s} support={metrics['support']:4d} "
            f"percentage={metrics['percentage'] * 100:.2f}%"
        )

    print("\nHigh-confidence errors")
    print("----------------------")
    if not high_confidence_errors:
        print("None")
    for index, prediction in enumerate(high_confidence_errors, start=1):
        print(f"\n{index}.")
        print(f"filename: {prediction['filename']}")
        print(f"true: {prediction['true_class']}")
        print(f"predicted: {prediction['predicted_class']}")
        print(f"confidence: {prediction['confidence']:.6f}")

    print("\nConfusion Matrix:")
    for row in results["confusion_matrix"]:
        print(row)
    print(f"\nSaved results to: {RESULTS_PATH}")
    print(f"Saved predictions to: {PREDICTIONS_PATH}")
    print(f"Saved confusion matrix to: {CONFUSION_MATRIX_PATH}")


def evaluate():
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

    file_paths = _test_file_paths()
    dataset = _load_test_dataset()
    if dataset.class_names != CLASS_NAMES:
        raise ValueError(f"Unexpected dataset classes: {dataset.class_names}")
    if len(file_paths) == 0:
        raise ValueError("The prepared test dataset is empty")

    model = tf.keras.models.load_model(MODEL_PATH, compile=False)
    predictions = model.predict(dataset, verbose=0)
    y_true = np.concatenate([labels.numpy() for _, labels in dataset], axis=0)
    y_pred = np.argmax(predictions, axis=1)

    if len(file_paths) != len(y_true):
        raise RuntimeError(
            f"Test file count ({len(file_paths)}) does not match dataset count ({len(y_true)})"
        )

    confidences = predictions.max(axis=1).astype(float)
    correct = (y_true == y_pred)
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true,
        y_pred,
        labels=range(len(CLASS_NAMES)),
        zero_division=0,
    )
    weighted_precision, weighted_recall, weighted_f1, _ = precision_recall_fscore_support(
        y_true,
        y_pred,
        labels=range(len(CLASS_NAMES)),
        average="weighted",
        zero_division=0,
    )
    matrix = confusion_matrix(y_true, y_pred, labels=range(len(CLASS_NAMES)))
    class_metrics = {}
    for index, class_name in enumerate(CLASS_NAMES):
        class_support = int(support[index])
        class_metrics[class_name] = {
            "precision": float(precision[index]),
            "recall": float(recall[index]),
            "f1": float(f1[index]),
            "support": class_support,
            "percentage": float(class_support / len(y_true)),
        }

    prediction_rows = [
        {
            "filename": str(path.relative_to(TEST_DIR)).replace(os.sep, "/"),
            "true_class": CLASS_NAMES[int(true_class)],
            "predicted_class": CLASS_NAMES[int(predicted_class)],
            "confidence": float(confidence),
            "correct": bool(is_correct),
        }
        for path, true_class, predicted_class, confidence, is_correct in zip(
            file_paths,
            y_true,
            y_pred,
            confidences,
            correct,
        )
    ]
    high_confidence_errors = sorted(
        (row for row in prediction_rows if not row["correct"]),
        key=lambda row: row["confidence"],
        reverse=True,
    )[:20]
    confidence_buckets = _confidence_buckets(confidences, correct)
    report = classification_report(
        y_true,
        y_pred,
        labels=range(len(CLASS_NAMES)),
        target_names=CLASS_NAMES,
        output_dict=True,
        zero_division=0,
    )

    results = {
        "model": "MobileNetV2",
        "dataset": "Myntra",
        "dataset_split": "test",
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "image_size": list(IMG_SIZE),
        "class_names": CLASS_NAMES,
        "test_samples": int(len(y_true)),
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "macro_precision": float(precision.mean()),
        "macro_recall": float(recall.mean()),
        "macro_f1": float(f1.mean()),
        "weighted_precision": float(weighted_precision),
        "weighted_recall": float(weighted_recall),
        "weighted_f1": float(weighted_f1),
        "classes": class_metrics,
        "confusion_matrix": matrix.astype(int).tolist(),
        "classification_report": report,
        "confidence_buckets": confidence_buckets,
        "high_confidence_errors": high_confidence_errors,
    }

    RESULTS_PATH.write_text(json.dumps(results, indent=2), encoding="utf-8")
    REPORT_PATH.write_text(json.dumps(results, indent=2), encoding="utf-8")
    with PREDICTIONS_PATH.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=["filename", "true_class", "predicted_class", "confidence", "correct"],
        )
        writer.writeheader()
        writer.writerows(prediction_rows)
    _save_confusion_matrix(matrix)
    _print_report(results, high_confidence_errors)
    return results


if __name__ == "__main__":
    # Support both `python ml_model/evaluate.py` and module execution.
    sys.path.insert(0, str(BASE_DIR))
    evaluate()