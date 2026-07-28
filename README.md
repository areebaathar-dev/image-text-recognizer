# Image Text Recognizer

A small OCR tool that pulls readable text out of an image, a screenshot, a photo of a page, a scanned note, and hands it back as clean, copyable text. Everything runs locally: the image never leaves your machine.

## Features

- Drag-and-drop or click-to-browse image upload
- Image cleanup (grayscale, contrast boost, sharpening) before OCR, so noisy phone photos read better
- Confidence score for every scan, so you know how much to trust the result
- Copy to clipboard or download as a `.txt` file
- No files are ever kept on disk. Each image is processed from a temp file and deleted right after
- Rate limiting and file-type validation built in

## How it works

1. The uploaded image is saved under a random temporary name (never the original filename).
2. Pillow converts it to grayscale, boosts contrast, and sharpens edges.
3. Tesseract OCR reads the cleaned-up image and returns both the text and a per-word confidence score.
4. The average confidence across all recognized words is sent back along with the text.
5. The temp file is deleted immediately, whether the scan succeeded or failed.

## Tech stack

| Layer         | Tools used                     |
|---------------|---------------------------------|
| Backend       | Flask, pytesseract, Pillow      |
| Frontend      | Plain HTML, CSS, JavaScript (no framework, no build step) |
| Rate limiting | Flask-Limiter                   |
| OCR engine    | Tesseract OCR                   |

## Security notes

- Uploaded files are validated by extension and MIME type before processing.
- Every file is re-verified with `Image.verify()` to catch anything disguised as an image.
- Max upload size is 8MB, enforced on the server.
- Scans are capped at 10 per minute per IP address.
- Security headers are set on every response (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
- Extracted text is rendered with `textContent`, never `innerHTML`, so nothing in an image can execute as script.

## Getting started

### 1. Install Tesseract

`pytesseract` is only a Python wrapper. The actual OCR engine has to be installed separately.

**Windows:** download the installer from the [UB-Mannheim Tesseract build](https://github.com/UB-Mannheim/tesseract/wiki) and run it. If you skip adding it to PATH, the app still finds it automatically at the default install location (`C:\Program Files\Tesseract-OCR`).

**macOS:**
```bash
brew install tesseract
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt install tesseract-ocr
```

Verify it worked:
```bash
tesseract --version
```

### 2. Clone and set up the project

```bash
git clone https://github.com/<your-username>/image-text-recognizer.git
cd image-text-recognizer
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Run it

```bash
python app.py
```

Open **http://127.0.0.1:5000** in your browser.

## Project structure

```
image-text-recognizer/
├── app.py                 # Flask app + OCR pipeline
├── requirements.txt
├── README.md
├── .gitignore
├── templates/
│   └── index.html
└── static/
    ├── css/
    │   └── style.css
    └── js/
        └── app.js
```

## Configuration

A few things can be tuned directly in `app.py`:

| Setting              | Where                          | Default        |
|-----------------------|---------------------------------|----------------|
| Max upload size       | `MAX_CONTENT_LENGTH`           | 8MB            |
| Rate limit            | `@limiter.limit(...)` on `/api/scan` | 10/minute |
| Accepted file types    | `ALLOWED_EXTENSIONS`           | png, jpg, jpeg, bmp, webp |

## License

Released under the MIT License, see `LICENSE`.
