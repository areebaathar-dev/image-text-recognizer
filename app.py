"""
Image Text Recognizer — pulls readable text out of images using Tesseract OCR.

Run with `python app.py`, then open http://127.0.0.1:5000
"""

import os
import uuid
import tempfile
from pathlib import Path

from flask import Flask, render_template, request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from PIL import Image, ImageOps, ImageFilter, UnidentifiedImageError
import pytesseract

# Windows installs often skip "Add to PATH" during setup — fall back to the
# default install location so the app still works without extra config.
_default_win_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.name == "nt" and os.path.isfile(_default_win_path):
    pytesseract.pytesseract.tesseract_cmd = _default_win_path

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024  # 8MB cap keeps things fast and blocks abuse
app.config["JSON_SORT_KEYS"] = False

limiter = Limiter(get_remote_address, app=app, default_limits=["30 per minute"])

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "bmp", "webp"}
ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/bmp", "image/webp"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def preprocess(image: Image.Image) -> Image.Image:
    """Light cleanup so Tesseract has an easier time on noisy phone photos."""
    gray = ImageOps.grayscale(image)
    gray = ImageOps.autocontrast(gray, cutoff=1)
    return gray.filter(ImageFilter.SHARPEN)


def extract_text(image: Image.Image):
    processed = preprocess(image)
    data = pytesseract.image_to_data(processed, output_type=pytesseract.Output.DICT)

    words, confidences = [], []
    for text, conf in zip(data["text"], data["conf"]):
        text = text.strip()
        conf = float(conf)
        if text and conf > 0:
            words.append(text)
            confidences.append(conf)

    full_text = " ".join(words).strip()
    avg_conf = round(sum(confidences) / len(confidences), 1) if confidences else 0.0
    return full_text, avg_conf


@app.after_request
def set_secure_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; img-src 'self' blob: data:; "
        "style-src 'self' fonts.googleapis.com 'unsafe-inline'; "
        "font-src fonts.gstatic.com; script-src 'self'"
    )
    return response


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/privacy")
def privacy():
    return render_template("privacy.html")


@app.route("/api/scan", methods=["POST"])
@limiter.limit("10 per minute")
def scan():
    if "image" not in request.files:
        return jsonify(error="No image was sent."), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify(error="No file selected."), 400

    if not allowed_file(file.filename) or file.mimetype not in ALLOWED_MIME_TYPES:
        return jsonify(error="Unsupported file type. Use PNG, JPG, BMP or WEBP."), 415

    # save under a random name so nothing about the original filename ever touches disk
    suffix = Path(file.filename).suffix.lower()
    tmp_path = Path(tempfile.gettempdir()) / f"{uuid.uuid4().hex}{suffix}"

    try:
        file.save(tmp_path)

        with Image.open(tmp_path) as probe:
            probe.verify()  # confirms this is really an image, not a disguised payload

        with Image.open(tmp_path) as img:
            text, confidence = extract_text(img)
    except UnidentifiedImageError:
        return jsonify(error="That file isn't a valid image."), 400
    except Exception:
        return jsonify(error="Couldn't process that image. Try another one."), 500
    finally:
        tmp_path.unlink(missing_ok=True)

    if not text:
        return jsonify(text="", confidence=0, words=0, message="No readable text found in this image.")

    return jsonify(text=text, confidence=confidence, words=len(text.split()))


@app.errorhandler(413)
def too_large(_e):
    return jsonify(error="Image is too large. Max size is 8MB."), 413


@app.errorhandler(429)
def rate_limited(_e):
    return jsonify(error="Too many scans — slow down a little and try again."), 429


if __name__ == "__main__":
    app.run(debug=False)
