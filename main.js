const header = document.getElementById("sceneHeader");
const toggle = document.getElementById("toggleHeader");

// collapse/expand header scene (only if toggle exists)
if (header && toggle) {
  toggle.addEventListener("click", () => {
    const collapsed = header.classList.toggle("isCollapsed");
    toggle.setAttribute("aria-expanded", (!collapsed).toString());
  });
}

// Optional: close the header when a tile is clicked (feels like “selecting a car”)
document.querySelectorAll(".tile").forEach(tile => {
  tile.addEventListener("click", () => {
    if (header) header.classList.add("isCollapsed");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  });
});

(() => {
  const box = document.getElementById("cadBox");
  const text = document.getElementById("cadText");
  const wEl = document.getElementById("dimW");
  const hEl = document.getElementById("dimH");
  if (!box || !text || !wEl || !hEl) return;

  const updateDims = () => {
    const r = box.getBoundingClientRect();
    wEl.textContent = Math.round(r.width);
    hEl.textContent = Math.round(r.height);
  };

  const measureTextContent = () => {
    const kids = [...text.children];
    if (!kids.length) {
      return { w: text.scrollWidth, h: text.scrollHeight };
    }

    const style = window.getComputedStyle(text);
    const isRow = style.flexDirection.startsWith("row");
    const gapRaw = parseFloat(style.columnGap || style.gap || "0");
    const gap = Number.isFinite(gapRaw) ? gapRaw : 0;

    const rects = kids.map((el) => el.getBoundingClientRect());
    if (isRow) {
      const w = rects.reduce((sum, r) => sum + r.width, 0) + gap * Math.max(0, kids.length - 1);
      const h = rects.reduce((mx, r) => Math.max(mx, r.height), 0);
      return { w, h };
    }

    const w = rects.reduce((mx, r) => Math.max(mx, r.width), 0);
    const h = rects.reduce((sum, r) => sum + r.height, 0) + gap * Math.max(0, kids.length - 1);
    return { w, h };
  };

  // live update on load/resize
  updateDims();
  window.addEventListener("resize", updateDims);

  // --- resizable handles ---
  const handles = [...box.querySelectorAll(".sketchHandle")];

  let start = null;

  const onDown = (e, corner) => {
    e.preventDefault();
    const r = box.getBoundingClientRect();
    start = {
      corner,
      x: e.clientX,
      y: e.clientY,
      w: r.width,
      h: r.height,
      font: parseFloat(window.getComputedStyle(text).fontSize)
    };

    // lock current computed width so resizing is stable
    box.style.width = `${Math.round(r.width)}px`;
  };

  const onMove = (e) => {
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    // change width/height based on which corner is dragged
    let newW = start.w;
    let newH = start.h;

    if (start.corner.includes("r")) newW = start.w + dx;
    if (start.corner.includes("l")) newW = start.w - dx;

    if (start.corner.includes("b")) newH = start.h + dy;
    if (start.corner.includes("t")) newH = start.h - dy;

    // clamp to viewport limits first
    const maxW = window.innerWidth - 40;
    const maxH = 220;
    newW = Math.max(280, Math.min(newW, maxW));
    newH = Math.max(90, Math.min(newH, maxH));

    // Scale name by width so inward corner drags always shrink text.
    let nextFont = Math.max(28, Math.min(start.font * (newW / start.w), 96));
    text.style.fontSize = `${Math.round(nextFont)}px`;

    // Prevent resizing smaller than the rendered title content.
    const boxStyle = window.getComputedStyle(box);
    const padX = parseFloat(boxStyle.paddingLeft) + parseFloat(boxStyle.paddingRight);
    const padY = parseFloat(boxStyle.paddingTop) + parseFloat(boxStyle.paddingBottom);
    const content = measureTextContent();
    const minContentW = Math.ceil(content.w + padX + 2);
    const minContentH = Math.ceil(content.h + padY + 2);

    newW = Math.max(newW, minContentW);
    newH = Math.max(newH, minContentH);
    newW = Math.min(newW, maxW);
    newH = Math.min(newH, maxH);

    // Recompute font from final clamped width.
    nextFont = Math.max(28, Math.min(start.font * (newW / start.w), 96));
    text.style.fontSize = `${Math.round(nextFont)}px`;

    box.style.width = `${Math.round(newW)}px`;
    box.style.paddingTop = "1.15rem"; // keep padding consistent
    box.style.paddingBottom = "2.25rem";

    // fake the height by padding (keeps layout stable + simple)
    // If you want true height resizing, we can do that too.
    box.style.minHeight = `${Math.round(newH)}px`;

    updateDims();
  };

  const onUp = () => {
    start = null;
  };

  handles.forEach(h => {
    const corner = h.classList.contains("tl") ? "tl"
      : h.classList.contains("tr") ? "tr"
      : h.classList.contains("bl") ? "bl"
      : "br";

    h.addEventListener("pointerdown", (e) => onDown(e, corner));
  });

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
})();
