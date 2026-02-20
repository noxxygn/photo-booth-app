// Main photo booth logic

// DOM references
const video = document.getElementById("camera");
const cameraOverlay = document.getElementById("cameraOverlay");
const countdownNumber = document.getElementById("countdownNumber");
const photoCountSelect = document.getElementById("photoCount");
const startButton = document.getElementById("startButton");
const thumbnailsContainer = document.getElementById("thumbnails");
const statusMessage = document.getElementById("statusMessage");
const stripPreview = document.getElementById("stripPreview");
const stripCaption = document.getElementById("stripCaption");
const stripTextInput = document.getElementById("stripText");
const stickerPalette = document.getElementById("stickerPalette");
const clearStickersButton = document.getElementById("clearStickersButton");
const downloadButton = document.getElementById("downloadButton");
const captureCanvas = document.getElementById("captureCanvas");

const captureCtx = captureCanvas.getContext("2d");

// State
let capturedImages = []; // data URLs
let isCapturing = false;
let activeDragSticker = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Initialize camera on load
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    video.srcObject = stream;
    statusMessage.textContent = "Camera ready. Choose shots and press Start.";
  } catch (err) {
    console.error("Error accessing camera", err);
    statusMessage.textContent =
      "Unable to access camera. Please allow camera permissions in your browser.";
  }
}

// Update thumbnails and strip slots from capturedImages
function refreshPreviews() {
  thumbnailsContainer.innerHTML = "";

  capturedImages.forEach((src) => {
    const img = document.createElement("img");
    img.src = src;
    thumbnailsContainer.appendChild(img);
  });

  const slots = stripPreview.querySelectorAll(".strip-slot");
  slots.forEach((slot, index) => {
    slot.innerHTML = "";
    const imgIndex = index;
    if (capturedImages[imgIndex]) {
      const img = document.createElement("img");
      img.src = capturedImages[imgIndex];
      slot.appendChild(img);
    }
  });
}

// Simple 3-2-1 countdown before each shot
function runCountdown() {
  return new Promise((resolve) => {
    cameraOverlay.classList.remove("hidden");
    let value = 3;
    countdownNumber.textContent = value.toString();

    const intervalId = setInterval(() => {
      value -= 1;
      if (value <= 0) {
        clearInterval(intervalId);
        cameraOverlay.classList.add("hidden");
        resolve();
      } else {
        countdownNumber.textContent = value.toString();
      }
    }, 800);
  });
}

// Capture a single frame from the video into a data URL
function captureFrame() {
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;
  captureCanvas.width = width;
  captureCanvas.height = height;
  captureCtx.drawImage(video, 0, 0, width, height);
  return captureCanvas.toDataURL("image/png");
}

// Capture N photos in sequence with countdowns
async function startCaptureSequence() {
  if (isCapturing) return;

  const count = parseInt(photoCountSelect.value, 10);
  isCapturing = true;
  startButton.disabled = true;
  statusMessage.textContent = "Get ready…";

  capturedImages = [];

  for (let i = 0; i < count; i++) {
    statusMessage.textContent = `Photo ${i + 1} of ${count}`;
    await runCountdown();
    const frame = captureFrame();
    capturedImages.push(frame);
    refreshPreviews();
  }

  statusMessage.textContent = "Done! You can now decorate and download your strip.";
  isCapturing = false;
  startButton.disabled = false;
}

// Theme selection: apply class to strip preview
function onThemeChange(event) {
  const theme = event.target.value;
  stripPreview.classList.remove("theme-classic", "theme-pastel", "theme-neon");
  stripPreview.classList.add(`theme-${theme}`);
}

// Caption handling
function onCaptionInput(event) {
  const value = event.target.value.trim();
  stripCaption.textContent = value || "Your caption";
}

// Sticker creation on the strip
function addStickerToStrip(symbol) {
  const stickerEl = document.createElement("div");
  stickerEl.className = "sticker-instance";
  stickerEl.textContent = symbol;

  // initial position roughly center
  const rect = stripPreview.getBoundingClientRect();
  stickerEl.style.left = rect.width / 2 - 16 + "px";
  stickerEl.style.top = rect.height / 2 - 16 + "px";

  // attach drag listeners
  stickerEl.addEventListener("pointerdown", onStickerPointerDown);

  stripPreview.querySelector(".strip-inner").appendChild(stickerEl);
}

// Clear all stickers from the strip
function clearStickers() {
  const stickers = stripPreview.querySelectorAll(".sticker-instance");
  stickers.forEach((el) => el.remove());
}

// Drag handling for stickers
function onStickerPointerDown(event) {
  event.preventDefault();
  const target = event.currentTarget;
  activeDragSticker = target;
  activeDragSticker.classList.add("dragging");

  const rect = activeDragSticker.getBoundingClientRect();
  dragOffsetX = event.clientX - rect.left;
  dragOffsetY = event.clientY - rect.top;

  window.addEventListener("pointermove", onStickerPointerMove);
  window.addEventListener("pointerup", onStickerPointerUp);
}

function onStickerPointerMove(event) {
  if (!activeDragSticker) return;

  const containerRect = stripPreview.getBoundingClientRect();
  const x = event.clientX - containerRect.left - dragOffsetX;
  const y = event.clientY - containerRect.top - dragOffsetY;

  activeDragSticker.style.left = `${x}px`;
  activeDragSticker.style.top = `${y}px`;
}

function onStickerPointerUp() {
  if (!activeDragSticker) return;
  activeDragSticker.classList.remove("dragging");
  activeDragSticker = null;
  window.removeEventListener("pointermove", onStickerPointerMove);
  window.removeEventListener("pointerup", onStickerPointerUp);
}

// Export strip preview as PNG using html2canvas
async function downloadStrip() {
  try {
    downloadButton.disabled = true;
    downloadButton.textContent = "Rendering…";

    const canvas = await html2canvas(stripPreview, {
      backgroundColor: null,
      scale: window.devicePixelRatio > 1 ? 2 : 1.5,
    });

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "photo-strip.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    console.error("Failed to export strip", err);
    alert("Sorry, something went wrong while generating the PNG.");
  } finally {
    downloadButton.disabled = false;
    downloadButton.textContent = "Download PNG";
  }
}

// Event wiring
function attachEventListeners() {
  startButton.addEventListener("click", startCaptureSequence);
  stripTextInput.addEventListener("input", onCaptionInput);
  clearStickersButton.addEventListener("click", clearStickers);
  downloadButton.addEventListener("click", downloadStrip);

  // Theme radios
  document.querySelectorAll('input[name="theme"]').forEach((input) => {
    input.addEventListener("change", onThemeChange);
  });

  // Sticker palette
  stickerPalette.addEventListener("click", (event) => {
    const btn = event.target.closest(".sticker-btn");
    if (!btn) return;
    const symbol = btn.getAttribute("data-sticker");
    addStickerToStrip(symbol);
  });
}

// Bootstrap
window.addEventListener("DOMContentLoaded", () => {
  attachEventListeners();
  initCamera();
});

