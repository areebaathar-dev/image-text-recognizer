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

  if (!currentText) {
    resultBody.innerHTML = `<p class="placeholder">${data.message || "No readable text found in this image."}</p>`;
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
    confidenceBadge.hidden = true;
    wordCount.textContent = "";
    return;
  }

  // textContent, not innerHTML — never trust extracted text as markup
  resultBody.textContent = currentText;

  confidenceBadge.hidden = false;
  confidenceValue.textContent = `${data.confidence}% confidence`;

  wordCount.textContent = `${data.words} word${data.words === 1 ? "" : "s"}`;
  copyBtn.disabled = false;
  downloadBtn.disabled = false;
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
