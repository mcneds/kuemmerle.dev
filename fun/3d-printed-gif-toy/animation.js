import { hexToRgb, createAltColor } from "./ui.js";

class PrintToyAnimation {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: false });

    this.renderCanvas = document.createElement("canvas");
    this.renderCtx = this.renderCanvas.getContext("2d", { alpha: false });

    this.sourceCanvas = document.createElement("canvas");
    this.sourceCtx = this.sourceCanvas.getContext("2d", { alpha: false });

    this.settings = { ...settings };
    this.runtime = {
      playing: true,
      elapsed: 0,
      frameAccumulator: 0,
      lastTime: performance.now()
    };

    this.imageReady = false;
  }

  setImage(imageLike) {
    const maxW = 1024;
    const maxH = 700;
    const scale = Math.min(maxW / imageLike.width, maxH / imageLike.height, 1);
    const w = Math.max(32, Math.round(imageLike.width * scale));
    const h = Math.max(32, Math.round(imageLike.height * scale));

    this.sourceCanvas.width = w;
    this.sourceCanvas.height = h;
    this.sourceCtx.clearRect(0, 0, w, h);
    this.sourceCtx.drawImage(imageLike, 0, 0, w, h);

    this.renderCanvas.width = w;
    this.renderCanvas.height = h;
    this.canvas.width = w;
    this.canvas.height = h;

    this.imageReady = true;
    this.restart();
    this.draw();
  }

  setSettings(patch) {
    this.settings = { ...this.settings, ...patch };
  }

  setPlaying(next) {
    this.runtime.playing = next;
    this.runtime.lastTime = performance.now();
  }

  restart() {
    this.runtime.elapsed = 0;
    this.runtime.frameAccumulator = 0;
    this.runtime.lastTime = performance.now();
  }

  update(now = performance.now()) {
    if (!this.runtime.playing || !this.imageReady) {
      this.runtime.lastTime = now;
      return;
    }

    const dt = Math.max(0, Math.min(0.1, (now - this.runtime.lastTime) / 1000));
    this.runtime.lastTime = now;

    const frameStep = 1 / this.settings.fps;
    this.runtime.frameAccumulator += dt;

    while (this.runtime.frameAccumulator >= frameStep) {
      this.runtime.elapsed += frameStep;
      this.runtime.frameAccumulator -= frameStep;
    }

    const loopSeconds = this.getLoopDurationSeconds();
    if (this.runtime.elapsed > loopSeconds) {
      this.runtime.elapsed = this.runtime.elapsed % loopSeconds;
    }
  }

  getLoopDurationSeconds() {
    if (!this.imageReady) return 1;
    const h = this.sourceCanvas.height;
    const layers = Math.ceil(h / this.settings.layerHeight);
    const travel = this.sourceCanvas.width / this.settings.printSpeed;
    const turnPause = 0.07 + this.settings.imperfection * 0.16;
    return layers * (travel + turnPause) + 0.35;
  }

  applyWarp(p) {
    const w = this.settings.timeWarp;
    if (Math.abs(w - 1) < 0.0001) return p;
    if (w > 1) {
      return p ** w;
    }
    return 1 - ((1 - p) ** (1 / w));
  }

  getStateAt(timeSeconds) {
    const w = this.sourceCanvas.width;
    const h = this.sourceCanvas.height;
    const layerHeight = this.settings.layerHeight;
    const layers = Math.ceil(h / layerHeight);
    const travel = w / this.settings.printSpeed;
    const turnPause = 0.07 + this.settings.imperfection * 0.16;
    const passDuration = travel + turnPause;
    const total = layers * passDuration;

    let t = timeSeconds % total;
    if (t < 0) t += total;

    const layerIndex = Math.min(layers - 1, Math.floor(t / passDuration));
    const local = t - layerIndex * passDuration;
    const direction = layerIndex % 2 === 0 ? 1 : -1;

    const moving = local < travel;
    const moveProgress = moving ? local / travel : 1;
    const warped = this.applyWarp(Math.min(1, Math.max(0, moveProgress)));

    const headX = direction === 1 ? warped * w : (1 - warped) * w;
    const y0 = Math.max(0, h - (layerIndex + 1) * layerHeight);

    return {
      width: w,
      height: h,
      layerHeight,
      layers,
      layerIndex,
      y0,
      direction,
      headX,
      moveProgress: warped,
      moving,
      timeSeconds
    };
  }

  drawPrintedLayer(state, ctx) {
    const { width, height, y0, layerHeight, direction, headX, layerIndex, timeSeconds } = state;
    const fullRows = Math.min(height, layerIndex * layerHeight);

    if (fullRows > 0) {
      this.paintSegment(ctx, 0, height - fullRows, width, fullRows, layerIndex);
    }

    if (y0 >= height) return;

    const rows = Math.min(layerHeight, height - y0);
    const trail = Math.max(4, this.settings.extrusionWidth * 4.6);

    for (let i = 0; i < rows; i += 1) {
      const y = y0 + i;
      const wobble = this.settings.imperfection * 2.2 * Math.sin((y + layerIndex * 3) * 0.35 + timeSeconds * 9.2);
      const boundary = Math.max(0, Math.min(width, headX + wobble));
      const rowWidth = direction === 1
        ? Math.max(0, Math.min(width, boundary))
        : Math.max(0, Math.min(width, width - boundary));
      if (rowWidth < 0.5) continue;

      const sx = direction === 1 ? 0 : boundary;
      const dx = sx;
      this.paintSegment(ctx, sx, y, rowWidth, 1, layerIndex, dx, y);

      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "#000000";
      ctx.fillRect(dx, y + this.settings.extrusionWidth, rowWidth, 1.2);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.1 + this.settings.imperfection * 0.16;
      ctx.fillStyle = direction === 1 ? "#d8efff" : "#c4ffe1";
      const trailW = Math.max(
        0,
        Math.min(trail, rowWidth)
      );
      if (direction === 1) {
        ctx.fillRect(Math.max(0, boundary - trailW), y, trailW, 1);
      } else {
        ctx.fillRect(boundary, y, trailW, 1);
      }
      ctx.restore();
    }
  }

  paintSegment(ctx, sx, sy, sw, sh, layerIndex, dx = sx, dy = sy) {
    if (sw <= 0 || sh <= 0) return;
    const mode = this.settings.colorMode;
    ctx.drawImage(this.sourceCanvas, sx, sy, sw, sh, dx, dy, sw, sh);

    if (mode === "original") return;

    const base = this.settings.filamentColor;
    const alt = createAltColor(base);
    const use = mode === "single" ? base : (layerIndex % 2 === 0 ? base : alt);
    const rgb = hexToRgb(use);

    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.globalAlpha = 0.86;
    ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    ctx.fillRect(dx, dy, sw, sh);
    ctx.restore();
  }

  drawHead(state, ctx) {
    const { y0, layerHeight, direction, headX, moving } = state;
    const wobble = this.settings.imperfection * 1.5 * Math.sin(state.timeSeconds * 20);
    const x = headX + (direction === 1 ? 0 : 0);
    const y = y0 + layerHeight * 0.5 + wobble;
    const bodyW = 46;
    const bodyH = 24;
    const nozzleH = 15;

    ctx.save();
    ctx.translate(x, y - 22);

    ctx.fillStyle = "rgba(198,224,255,0.96)";
    ctx.strokeStyle = "rgba(18,33,55,0.85)";
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.roundRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1e2d45";
    ctx.fillRect(-7, bodyH / 2 - 1, 14, nozzleH);
    ctx.fillStyle = "#81d4ff";
    ctx.fillRect(-5, bodyH / 2 + nozzleH - 2, 10, 4);

    if (moving) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = direction === 1 ? "#9effcf" : "#95b7ff";
      ctx.beginPath();
      ctx.ellipse(direction === 1 ? -18 : 18, 0, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawAtTime(timeSeconds, outCtx = this.ctx) {
    if (!this.imageReady) return;
    const state = this.getStateAt(timeSeconds);
    const { width, height } = state;

    outCtx.fillStyle = this.settings.backgroundColor;
    outCtx.fillRect(0, 0, width, height);

    this.drawPrintedLayer(state, outCtx);
    this.drawHead(state, outCtx);
  }

  draw() {
    this.drawAtTime(this.runtime.elapsed, this.ctx);
  }
}

export { PrintToyAnimation };
