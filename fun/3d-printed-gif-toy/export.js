function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

async function exportGif(animation, settings, setStatus) {
  if (typeof window.GIF !== "function") {
    setStatus("GIF encoder unavailable. Requires network to load gif.js.");
    return;
  }

  const width = animation.canvas.width;
  const height = animation.canvas.height;
  const fps = settings.fps;
  const duration = animation.getLoopDurationSeconds();
  const frameCount = Math.max(6, Math.ceil(duration * fps));

  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d", { alpha: false });

  setStatus(`Encoding GIF (${frameCount} frames)...`);

  const gif = new window.GIF({
    workers: 2,
    quality: 10,
    width,
    height,
    workerScript: "https://cdn.jsdelivr.net/npm/gif.js.optimized/dist/gif.worker.js"
  });

  for (let i = 0; i < frameCount; i += 1) {
    const t = (i / fps);
    animation.drawAtTime(t, ctx);
    gif.addFrame(ctx, { copy: true, delay: Math.round(1000 / fps) });
  }

  await new Promise((resolve) => {
    gif.on("finished", (blob) => {
      downloadBlob(blob, `printed-gif-toy-${Date.now()}.gif`);
      resolve();
    });
    gif.render();
  });

  setStatus("GIF export complete.");
}

async function exportMp4OrWebM(animation, settings, setStatus) {
  const fps = settings.fps;
  const width = animation.canvas.width;
  const height = animation.canvas.height;

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = width;
  exportCanvas.height = height;
  const ctx = exportCanvas.getContext("2d", { alpha: false });

  const stream = exportCanvas.captureStream(fps);
  const mime = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm"]
    .find((m) => MediaRecorder.isTypeSupported(m)) || "video/webm";

  const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mime });
      downloadBlob(blob, `printed-gif-toy-${Date.now()}.${ext}`);
      resolve();
    };
  });

  const duration = animation.getLoopDurationSeconds();
  const frameCount = Math.max(6, Math.ceil(duration * fps));
  setStatus(`Recording ${ext.toUpperCase()} (${frameCount} frames)...`);

  recorder.start();

  for (let i = 0; i < frameCount; i += 1) {
    const t = i / fps;
    animation.drawAtTime(t, ctx);
    await new Promise((r) => setTimeout(r, Math.round(1000 / fps)));
  }

  recorder.stop();
  await done;
  setStatus(`${ext.toUpperCase()} export complete.`);
}

export {
  exportGif,
  exportMp4OrWebM
};
