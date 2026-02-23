const DEFAULTS = {
  fps: 30,
  layerHeight: 3,
  extrusionWidth: 3,
  printSpeed: 420,
  backgroundColor: "#14202f",
  colorMode: "original",
  filamentColor: "#ff8f5e",
  imperfection: 0.2,
  timeWarp: 1
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map((x) => x + x).join("")
    : clean;
  const n = Number.parseInt(full, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255
  };
}

function rgbToHex({ r, g, b }) {
  const toHex = (n) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function createAltColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({
    r: clamp(255 - b * 0.62, 20, 240) | 0,
    g: clamp(255 - r * 0.55, 20, 240) | 0,
    b: clamp(255 - g * 0.45, 20, 240) | 0
  });
}

function makePlaceholderCanvas(width, height) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#7fe8ff");
  grad.addColorStop(0.5, "#7d8bff");
  grad.addColorStop(1, "#ff7eb6");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.28;
  for (let i = 0; i < 22; i += 1) {
    ctx.fillStyle = i % 2 ? "#081323" : "#ffffff";
    const w = 48 + i * 18;
    const h = 16 + (i % 6) * 8;
    ctx.fillRect((i * 57) % (width - w), (i * 39) % (height - h), w, h);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(6, 10, 18, 0.85)";
  ctx.fillRect(0, height - 85, width, 85);
  ctx.fillStyle = "#ecf3ff";
  ctx.font = "700 42px Syne, sans-serif";
  ctx.fillText("PRINT ME", 30, height - 30);
  ctx.font = "500 20px Space Grotesk, sans-serif";
  ctx.fillText("Drop your own image to remix this toy", 300, height - 34);

  return c;
}

export {
  DEFAULTS,
  hexToRgb,
  createAltColor,
  makePlaceholderCanvas
};
