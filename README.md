# 🔎 Image Text Recognizer

A small OCR tool that pulls readable text out of an image — a screenshot, a photo of a page, a scanned note — and hands it back as clean, copyable text. Everything runs **locally**: the image never leaves your machine.

![Python](https://img.shields.io/badge/Python-3670A0?style=flat&logo=python&logoColor=ffdd54)
![Flask](https://img.shields.io/badge/Flask-000000?style=flat&logo=flask&logoColor=white)
![Tesseract OCR](https://img.shields.io/badge/Tesseract-OCR-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📖 Overview

Upload an image and get clean, copyable text back — powered by Tesseract OCR with an image-cleanup pipeline (grayscale, contrast boost, sharpening) so noisy phone photos read better. Every scan comes with a confidence score, and nothing is ever stored on disk.

---

## ✨ Features

- Drag-and-drop or click-to-browse image upload
- Image cleanup (grayscale, contrast boost, sharpening) before OCR
- Confidence score for every scan
- Copy to clipboard or download as `.txt`
- Zero file retention — each image is processed from a temp file and deleted immediately
- Built-in rate limiting and file-type validation

---

## ⚙️ How It Works

1. Uploaded image is saved under a random temporary name (never the original filename)
2. Pillow converts it to grayscale, boosts contrast, and sharpens edges
3. Tesseract OCR reads the cleaned image and returns text + per-word confidence
4. Average confidence across all words is sent back with the text
5. The temp file is deleted immediately — success or failure

---

## 🛠️ Tech Stack

| Layer         | Tools used                     |
|---------------|---------------------------------|
| Backend       | Flask, pytesseract, Pillow      |
| Frontend      | Plain HTML, CSS, JavaScript (no framework) |
| Rate limiting | Flask-Limiter                   |
| OCR engine    | Tesseract OCR                   |

---

## 🔒 Security Notes

- Files validated by extension **and** MIME type before processing
- Every file re-verified with `Image.verify()` to catch disguised files
- Max upload size: 8MB, enforced server-side
- Scans capped at 10/minute per IP
- Security headers on every response (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- Extracted text rendered with `textContent`, never `innerHTML` — nothing in an image can execute as script

---

## 🚀 Getting Started

### 1. Install Tesseract
`pytesseract` is just a Python wrapper — the OCR engine installs separately.

**Windows:** download from [UB-Mannheim Tesseract build](https://github.com/UB-Mannheim/tesseract/wiki)
**macOS:** `brew install tesseract`
**Linux:** `sudo apt install tesseract-ocr`

Verify: `tesseract --version`

### 2. Clone & set up
```bash
git clone https://github.com/areebaathar-dev/image-text-recognizer.git
cd image-text-recognizer
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Run it
```bash
python app.py
```
Open **http://127.0.0.1:5000**

---

## 📁 Project Structure
image-text-recognizer/
├── app.py # Flask app + OCR pipeline
├── requirements.txt
├── templates/
│ └── index.html
└── static/
├── css/style.css
└── js/app.js

---

## ⚙️ Configuration

| Setting              | Where                          | Default        |
|-----------------------|---------------------------------|----------------|
| Max upload size       | `MAX_CONTENT_LENGTH`           | 8MB            |
| Rate limit            | `@limiter.limit(...)` on `/api/scan` | 10/minute |
| Accepted file types    | `ALLOWED_EXTENSIONS`           | png, jpg, jpeg, bmp, webp |

---

## 📄 License

MIT — see [LICENSE](LICENSE).

---

## 👩‍💻 Author

**Areeba Athar**
[LinkedIn](https://linkedin.com/in/areeba-athar) · [GitHub](https://github.com/areebaathar-dev)