import { DEFAULTS, makePlaceholderCanvas } from "./ui.js";
import { PrintToyAnimation } from "./animation.js";
import { exportGif, exportMp4OrWebM } from "./export.js";

const canvas = document.getElementById("toyCanvas");
const dropZone = document.getElementById("dropZone");
const dropOverlay = document.getElementById("dropOverlay");
const fileInput = document.getElementById("fileInput");
const statusEl = document.getElementById("status");

const controls = {
  fps: document.getElementById("fps"),
  layerHeight: document.getElementById("layerHeight"),
  extrusionWidth: document.getElementById("extrusionWidth"),
  printSpeed: document.getElementById("printSpeed"),
  backgroundColor: document.getElementById("backgroundColor"),
  colorMode: document.getElementById("colorMode"),
  filamentColor: document.getElementById("filamentColor"),
  imperfection: document.getElementById("imperfection"),
  timeWarp: document.getElementById("timeWarp")
};

const outputs = {
  fps: document.getElementById("fpsOut"),
  layerHeight: document.getElementById("layerHeightOut"),
  extrusionWidth: document.getElementById("extrusionWidthOut"),
  printSpeed: document.getElementById("printSpeedOut"),
  imperfection: document.getElementById("imperfectionOut"),
  timeWarp: document.getElementById("timeWarpOut")
};

const buttons = {
  togglePlay: document.getElementById("togglePlay"),
  resetAnim: document.getElementById("resetAnim"),
  exportGif: document.getElementById("exportGif"),
  exportMp4: document.getElementById("exportMp4")
};

const state = {
  settings: { ...DEFAULTS },
  busy: false
};

function setStatus(msg) {
  statusEl.textContent = msg;
}

function syncOutputs() {
  outputs.fps.textContent = String(state.settings.fps);
  outputs.layerHeight.textContent = `${state.settings.layerHeight}px`;
  outputs.extrusionWidth.textContent = `${state.settings.extrusionWidth}px`;
  outputs.printSpeed.textContent = `${state.settings.printSpeed}px/s`;
  outputs.imperfection.textContent = state.settings.imperfection.toFixed(2);
  outputs.timeWarp.textContent = state.settings.timeWarp.toFixed(2);
}

function initControlDefaults() {
  Object.entries(controls).forEach(([key, el]) => {
    el.value = String(state.settings[key]);
  });
  syncOutputs();
}

const animation = new PrintToyAnimation(canvas, state.settings);

function setBusy(next) {
  state.busy = next;
  Object.values(buttons).forEach((b) => {
    if (b.id === "togglePlay" || b.id === "resetAnim") return;
    b.disabled = next;
  });
}

function parseValue(key, value) {
  if (["fps", "layerHeight", "extrusionWidth", "printSpeed"].includes(key)) {
    return Number.parseInt(value, 10);
  }
  if (["imperfection", "timeWarp"].includes(key)) {
    return Number.parseFloat(value);
  }
  return value;
}

function bindControls() {
  Object.entries(controls).forEach(([key, el]) => {
    el.addEventListener("input", () => {
      const nextValue = parseValue(key, el.value);
      state.settings[key] = nextValue;
      animation.setSettings({ [key]: nextValue });
      syncOutputs();
    });
  });

  buttons.togglePlay.addEventListener("click", () => {
    const shouldPause = buttons.togglePlay.textContent === "Pause";
    animation.setPlaying(!shouldPause);
    buttons.togglePlay.textContent = shouldPause ? "Play" : "Pause";
  });

  buttons.resetAnim.addEventListener("click", () => {
    animation.restart();
  });

  buttons.exportGif.addEventListener("click", async () => {
    if (state.busy) return;
    setBusy(true);
    try {
      await exportGif(animation, state.settings, setStatus);
    } catch (err) {
      setStatus(`GIF export failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  });

  buttons.exportMp4.addEventListener("click", async () => {
    if (state.busy) return;
    setBusy(true);
    try {
      await exportMp4OrWebM(animation, state.settings, setStatus);
    } catch (err) {
      setStatus(`MP4 export failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  });
}

async function fileToImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load selected image."));
      img.src = url;
    });

    if (typeof img.decode === "function") {
      try {
        await img.decode();
      } catch {
        // Some browsers reject decode() for local files despite valid load.
      }
    }
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function isLikelyImage(file) {
  if (!file) return false;
  if (typeof file.type === "string" && file.type.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name || "");
}

async function loadImageFile(file) {
  if (!isLikelyImage(file)) {
    setStatus("Please choose a valid image file.");
    return;
  }
  const img = await fileToImage(file);
  animation.setImage(img);
  dropOverlay.innerHTML = "<strong>Image loaded</strong><span>Drag another image to reprint</span>";
  setStatus(`Loaded: ${file.name}`);
}

function setupDropZone() {
  const openPicker = () => {
    fileInput.value = "";
    fileInput.click();
  };

  dropZone.addEventListener("click", openPicker);
  dropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      await loadImageFile(file);
    } catch (err) {
      setStatus(`Could not load image: ${err.message}`);
    }
    fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach((evt) => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add("dragActive");
    });
  });

  ["dragleave", "drop"].forEach((evt) => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragActive");
    });
  });

  dropZone.addEventListener("drop", async (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    try {
      await loadImageFile(file);
    } catch (err) {
      setStatus(`Could not load image: ${err.message}`);
    }
  });
}

function startLoop() {
  const tick = (now) => {
    animation.update(now);
    animation.draw();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function boot() {
  initControlDefaults();
  bindControls();
  setupDropZone();

  const placeholder = makePlaceholderCanvas(960, 600);
  animation.setImage(placeholder);
  animation.setPlaying(true);
  setStatus("Live preview running.");

  startLoop();
}

boot();
