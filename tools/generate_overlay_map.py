import json
import sys

import cv2
import numpy as np


def fmt(value):
    return float(f"{value:.6f}")


def kmeans_1d(values, k=3, iters=30):
    values = np.array(values, dtype=float)
    quantiles = np.linspace(0.1, 0.9, k)
    centroids = np.quantile(values, quantiles)
    for _ in range(iters):
        labels = np.argmin(np.abs(values[:, None] - centroids[None, :]), axis=1)
        new_centroids = np.array(
            [values[labels == i].mean() if np.any(labels == i) else centroids[i] for i in range(k)]
        )
        if np.allclose(new_centroids, centroids):
            break
        centroids = new_centroids
    return labels, centroids


def main(img_path, out_path):
    img = cv2.imread(img_path)
    if img is None:
        raise SystemExit(f"Cannot read {img_path}")
    height, width = img.shape[:2]

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 40, 120)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)
    contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    boxes = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        area = w * h
        if area < 200 or area > 20000:
            continue
        aspect = w / float(h)
        if aspect < 0.7 or aspect > 1.3:
            continue
        if not (20 <= x <= 1200 and 360 <= y <= 650):
            continue
        if not (28 <= w <= 60 and 28 <= h <= 60):
            continue
        boxes.append((x, y, w, h))

    label_boxes = [b for b in boxes if 390 <= b[1] <= 415 and b[3] <= 40 and 43 <= b[2] <= 48]
    label_boxes = sorted(label_boxes, key=lambda b: b[0])
    if len(label_boxes) < 12:
        raise SystemExit(f"Expected ~12 label boxes; found {len(label_boxes)}. Adjust thresholds.")

    label_centers = np.array([x + w / 2 for x, y, w, h in label_boxes[:12]])
    y0 = np.mean([y + h / 2 for x, y, w, h in label_boxes[:12]])

    chord_boxes = [b for b in boxes if not (390 <= b[1] <= 415 and b[3] <= 40)]

    centers = np.array([[x + w / 2, y + h / 2] for x, y, w, h in chord_boxes], dtype=float)
    cx, cy = centers[:, 0], centers[:, 1]

    def score_s(slope):
        corrected = cx + slope * (cy - y0)
        idx = np.argmin(np.abs(corrected[:, None] - label_centers[None, :]), axis=1)
        residual = corrected - label_centers[idx]
        return float(np.mean(residual**2))

    slopes = np.linspace(-1.2, 1.2, 1201)
    scores = np.array([score_s(s) for s in slopes])
    slope = float(slopes[int(np.argmin(scores))])

    corrected = cx + slope * (cy - y0)
    idx = np.argmin(np.abs(corrected[:, None] - label_centers[None, :]), axis=1)

    roots = ["D#", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#"]
    qualities = ["maj", "min", "7"]

    elements = []
    for col in range(12):
        col_boxes = [chord_boxes[i] for i in range(len(chord_boxes)) if idx[i] == col]
        ycs = [y + h / 2 for x, y, w, h in col_boxes]
        labels, _ = kmeans_1d(ycs, k=3)

        clusters = {i: [] for i in range(3)}
        for b, l in zip(col_boxes, labels):
            clusters[int(l)].append(b)

        reps = []
        for i in range(3):
            if clusters[i]:
                reps.append(max(clusters[i], key=lambda b: b[2] * b[3]))
        reps = sorted(reps, key=lambda b: b[1] + b[3] / 2)

        for q, (x, y, w, h) in zip(qualities, reps):
            elements.append(
                {
                    "id": f"chord_{roots[col]}_{q}".replace("#", "s"),
                    "type": "chord",
                    "root": roots[col],
                    "quality": q,
                    "bbox": [fmt(x / width), fmt(y / height), fmt(w / width), fmt(h / height)],
                    "gesture": "hold",
                }
            )

    output = {
        "reference": {"width": width, "height": height, "image": "assets/omnichord.png"},
        "elements": elements,
    }
    with open(out_path, "w", encoding="utf-8") as handle:
        json.dump(output, handle, indent=2)
    print("Wrote", out_path)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python tools/generate_overlay_map.py assets/omnichord.png data/overlayMap.om108.json")
        raise SystemExit(2)
    main(sys.argv[1], sys.argv[2])
