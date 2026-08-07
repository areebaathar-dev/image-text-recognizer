const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const dzEmpty = document.getElementById("dzEmpty");
const dzPreview = document.getElementById("dzPreview");
const previewImg = document.getElementById("previewImg");
const scanLine = document.getElementById("scanLine");
const scanBtn = document.getElementById("scanBtn");
const clearBtn = document.getElementById("clearBtn");
const errorMsg = document.getElementById("errorMsg");

const resultBody = document.getElementById("resultBody");
const confidenceBadge = document.getElementById("confidenceBadge");
const confidenceValue = document.getElementById("confidenceValue");
const wordCount = document.getElementById("wordCount");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");

let currentFile = null;
let currentText = "";

// -- small visual touches --

function addRipple(e) {
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
  btn.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
}

document.querySelectorAll(".btn").forEach((btn) => btn.addEventListener("click", addRipple));

function countUpTo(target, onTick) {
  const duration = 600;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    onTick(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.hidden = false;
}

function clearError() {
  errorMsg.hidden = true;
  errorMsg.textContent = "";
}

function setFile(file) {
  clearError();

  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    showError("That file is over 8MB — try a smaller image.");
    return;
  }
  if (!file.type.startsWith("image/")) {
    showError("Please choose an image file.");
    return;
  }

  currentFile = file;
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  dzEmpty.hidden = true;
  dzPreview.hidden = false;
  resetResult();
}

function resetResult() {
  currentText = "";
  resultBody.innerHTML = '<p class="placeholder">Your extracted text will show up here once you scan an image.</p>';
  confidenceBadge.hidden = true;
  wordCount.textContent = "";
  copyBtn.disabled = true;
  downloadBtn.disabled = true;
  copyBtn.title = "Scan an image first";
  downloadBtn.title = "Scan an image first";
}

// -- drag & drop --

["dragenter", "dragover"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add("drag-over");
  })
);

["dragleave", "drop"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove("drag-over");
  })
);

dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  setFile(file);
});

dzEmpty.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => setFile(e.target.files[0]));

const trySampleBtn = document.getElementById("trySampleBtn");
trySampleBtn.addEventListener("click", async (e) => {
  e.stopPropagation();
  try {
    const res = await fetch("/static/img/sample.jpg");
    const blob = await res.blob();
    const file = new File([blob], "sample.jpg", { type: "image/jpeg" });
    setFile(file);
  } catch {
    showError("Couldn't load the sample image.");
  }
});

clearBtn.addEventListener("click", () => {
  currentFile = null;
  fileInput.value = "";
  dzPreview.hidden = true;
  dzEmpty.hidden = false;
  clearError();
  resetResult();
});

// -- scan --

scanBtn.addEventListener("click", async () => {
  if (!currentFile) return;

  clearError();
  scanBtn.classList.add("loading");
  scanBtn.disabled = true;
  scanLine.hidden = false;

  const formData = new FormData();
  formData.append("image", currentFile);

  try {
    const res = await fetch("/api/scan", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Something went wrong while scanning.");
      return;
    }

    renderResult(data);
    if (data.text) {
      scanBtn.classList.add("success");
      setTimeout(() => scanBtn.classList.remove("success"), 900);
    }
  } catch {
    showError("Couldn't reach the server. Check your connection and try again.");
  } finally {
    scanBtn.classList.remove("loading");
    scanBtn.disabled = false;
    scanLine.hidden = true;
  }
});

function renderResult(data) {
  currentText = data.text || "";
  resultBody.classList.remove("revealed");

  if (!currentText) {
    resultBody.innerHTML = `<p class="placeholder">${data.message || "No readable text found in this image."}</p>`;
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
    copyBtn.title = "Scan an image first";
    downloadBtn.title = "Scan an image first";
    confidenceBadge.hidden = true;
    wordCount.textContent = "";
    void resultBody.offsetWidth; // restart the reveal animation
    resultBody.classList.add("revealed");
    return;
  }

  // textContent, not innerHTML — never trust extracted text as markup
  resultBody.textContent = currentText;
  void resultBody.offsetWidth; // restart the reveal animation
  resultBody.classList.add("revealed");

  confidenceBadge.hidden = false;
  countUpTo(Math.round(data.confidence), (val) => {
    confidenceValue.textContent = `${val}% confidence`;
  });

  wordCount.textContent = `${data.words} word${data.words === 1 ? "" : "s"}`;
  copyBtn.disabled = false;
  downloadBtn.disabled = false;
  copyBtn.title = "Copy to clipboard";
  downloadBtn.title = "Download as a .txt file";
}

copyBtn.addEventListener("click", async () => {
  if (!currentText) return;
  await navigator.clipboard.writeText(currentText);
  const original = copyBtn.textContent;
  copyBtn.textContent = "Copied!";
  setTimeout(() => (copyBtn.textContent = original), 1400);
});

downloadBtn.addEventListener("click", () => {
  if (!currentText) return;
  const blob = new Blob([currentText], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "extracted-text.txt";
  a.click();
  URL.revokeObjectURL(url);
});
