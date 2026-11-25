import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJExporter } from "three/addons/exporters/OBJExporter.js";

const mount = document.getElementById("lithoViewport");
if (!mount) {
  throw new Error("Missing #lithoViewport mount node.");
}

const uploadInput = document.getElementById("lithoUpload");
const resolutionInput = document.getElementById("lithoResolution");
const resolutionNumberInput = document.getElementById("lithoResolutionNumber");
const minThicknessInput = document.getElementById("lithoMinThickness");
const maxThicknessInput = document.getElementById("lithoMaxThickness");
const minThicknessValue = document.getElementById("lithoMinThicknessValue");
const maxThicknessValue = document.getElementById("lithoMaxThicknessValue");
const imageStatus = document.getElementById("lithoImageStatus");
const statsEl = document.getElementById("lithoStats");
const downloadButton = document.getElementById("lithoDownload");
const resetViewButton = document.getElementById("lithoResetView");

if (
  !uploadInput ||
  !resolutionInput ||
  !resolutionNumberInput ||
  !minThicknessInput ||
  !maxThicknessInput ||
  !minThicknessValue ||
  !maxThicknessValue ||
  !statsEl ||
  !downloadButton ||
  !resetViewButton
) {
  throw new Error("Missing one or more lithophane controls.");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f17);
scene.fog = new THREE.Fog(0x0a0f17, 220, 560);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2500);
camera.position.set(0, 130, 230);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(mount.clientWidth, mount.clientHeight);
mount.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxDistance = 900;
controls.minDistance = 40;
controls.target.set(0, 25, 0);
controls.update();

const hemi = new THREE.HemisphereLight(0xbad7ff, 0x14181f, 0.4);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
keyLight.position.set(160, 220, 100);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xbfd4ff, 0.65);
rimLight.position.set(-140, 100, -160);
scene.add(rimLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(1400, 1400),
  new THREE.MeshStandardMaterial({ color: 0x101622, roughness: 0.95, metalness: 0.03 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -32;
floor.receiveShadow = true;
scene.add(floor);

const MAX_IMAGE_PIXELS = 4_000_000;
const MAX_IMAGE_SIDE = 4096;
const MM_PER_SOURCE_PIXEL = 0.082;
let sourceImage = null;

const lithoMaterial = new THREE.ShaderMaterial({
  vertexShader: `
    attribute float aBrightness;
    varying float vShade;
    void main() {
      vShade = aBrightness;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying float vShade;
    void main() {
      vec3 base = mix(vec3(0.08, 0.1, 0.14), vec3(0.88, 0.9, 0.95), vShade);
      gl_FragColor = vec4(base, 1.0);
    }
  `
});

const lithoMesh = new THREE.Mesh(new THREE.BufferGeometry(), lithoMaterial);
lithoMesh.visible = false;
lithoMesh.castShadow = true;
lithoMesh.receiveShadow = true;
scene.add(lithoMesh);

const boundedImageSize = (width, height) => {
  const scale = Math.min(1, MAX_IMAGE_SIDE / width, MAX_IMAGE_SIDE / height,
    Math.sqrt(MAX_IMAGE_PIXELS / (width * height)));
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    downscaled: scale < 1
  };
};

const extractBrightness = (rgba) => {
  const result = new Uint8Array(rgba.length / 4);
  for (let i = 0; i < result.length; i += 1) {
    const pixel = i * 4;
    result[i] = Math.round(0.2126 * rgba[pixel] + 0.7152 * rgba[pixel + 1] + 0.0722 * rgba[pixel + 2]);
  }
  return result;
};

let imageRequest = 0;
const combineImagesHorizontally = async (files, request) => {
  const images = [];
  try {
    for (const file of files) {
      if (request !== imageRequest) return null;
      images.push(await createImageBitmap(file));
    }
    if (request !== imageRequest) return null;

    const height = images.reduce((largest, img) => Math.max(largest, img.height), 0);
    const pad = 12;
    const widths = images.map((img) => Math.max(1, Math.round((img.width * height) / img.height)));
    const originalWidth = widths.reduce((total, width) => total + width, pad * 2);
    const originalHeight = height + pad * 2;
    const size = boundedImageSize(originalWidth, originalHeight);
    // Allocate only the bounded canvas. The GPU receives mesh attributes, not the image.
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Image canvas unavailable.");
    context.fillStyle = "#000000";
    context.fillRect(0, 0, size.width, size.height);
    const scaleX = size.width / originalWidth;
    const scaleY = size.height / originalHeight;
    let x = pad;
    for (const [i, image] of images.entries()) {
      context.drawImage(image, x * scaleX, pad * scaleY, widths[i] * scaleX, height * scaleY);
      x += widths[i];
    }
    return {
      ...size,
      widthMm: originalWidth * MM_PER_SOURCE_PIXEL,
      depthMm: originalHeight * MM_PER_SOURCE_PIXEL,
      brightness: extractBrightness(context.getImageData(0, 0, size.width, size.height).data)
    };
  } finally {
    for (const image of images) image.close();
  }
};

const normalizedResolution = () => Math.max(5, Math.min(100, Number(resolutionInput.value || 35)));

const MAX_MESH_VERTICES = 500_000;

const computeMeshBudget = (requestedPercent) => {
  const meshAt = (percent) => {
    const sx = Math.max(1, Math.floor(sourceImage.width * percent / 100));
    const sy = Math.max(1, Math.floor(sourceImage.height * percent / 100));
    // BoxGeometry has a separate grid for each face, with one segment through the thickness.
    const vertices = 2 * (sx + 1) * (sy + 1) + 4 * (sx + sy + 2);
    return { sx, sy, vertices };
  };

  const requested = meshAt(requestedPercent);
  if (requested.vertices <= MAX_MESH_VERTICES) {
    return { ...requested, appliedResolutionPercent: requestedPercent, limited: false };
  }

  // Find the highest uniform resolution in hundredths of a percent that fits.
  let low = 0;
  let high = Math.round(requestedPercent * 100);
  while (low < high) {
    const midpoint = Math.ceil((low + high) / 2);
    if (meshAt(midpoint / 100).vertices <= MAX_MESH_VERTICES) low = midpoint;
    else high = midpoint - 1;
  }
  const appliedResolutionPercent = low / 100;
  return { ...meshAt(appliedResolutionPercent), appliedResolutionPercent, limited: true };
};

const createLithophaneGeometry = (image, mesh, minThickness, maxThickness) => {
  const { width, height, widthMm, depthMm, brightness } = image;
  const geometry = new THREE.BoxGeometry(widthMm, minThickness, depthMm, mesh.sx, 1, mesh.sy);
  const positions = geometry.getAttribute("position");
  const shade = new Float32Array(positions.count);
  const sample = (u, v) => {
    const x = Math.min(width - 1, Math.max(0, Math.round(u * (width - 1))));
    const y = Math.min(height - 1, Math.max(0, Math.round(v * (height - 1))));
    return brightness[y * width + x] / 255;
  };
  for (let i = 0; i < positions.count; i += 1) {
    const value = sample(positions.getX(i) / widthMm + 0.5, positions.getZ(i) / depthMm + 0.5);
    shade[i] = value;
    // Move every copy of a top vertex, including copies on the side faces.
    if (positions.getY(i) > 0) {
      positions.setY(i, minThickness / 2 + (maxThickness - minThickness) * value);
    }
  }
  geometry.setAttribute("aBrightness", new THREE.BufferAttribute(shade, 1));
  geometry.computeVertexNormals();
  return geometry;
};

const rebuildGeometry = () => {
  if (!sourceImage) {
    updateStats(null);
    return;
  }
  const mesh = computeMeshBudget(normalizedResolution());
  const geometry = createLithophaneGeometry(sourceImage, mesh,
    Number(minThicknessInput.value), Number(maxThicknessInput.value));
  lithoMesh.geometry.dispose();
  lithoMesh.geometry = geometry;
  lithoMesh.visible = true;
  updateStats(mesh);
};

const updateStats = (mesh) => {
  if (!mesh) {
    statsEl.textContent = "Select an image to see mesh statistics.";
    return;
  }
  const { sx, sy, vertices, appliedResolutionPercent, limited } = mesh;
  const resolution = limited
    ? `Applied resolution: ${appliedResolutionPercent.toFixed(2)}% (mesh limit)`
    : `Applied resolution: ${appliedResolutionPercent}%`;
  statsEl.replaceChildren(...[
    `Segments: ${sx} × ${sy}`,
    `Vertices: ${vertices.toLocaleString()}`,
    resolution
  ].map((text) => {
    const row = document.createElement("div");
    row.textContent = text;
    return row;
  }));
};

const fitCameraToMesh = () => {
  if (!sourceImage) return;
  const box = new THREE.Box3().setFromObject(lithoMesh);
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  const distance = Math.max(120, sphere.radius * 2.9);
  camera.position.set(sphere.center.x + distance * 0.35, sphere.center.y + distance * 0.5, sphere.center.z + distance);
  controls.target.copy(sphere.center);
  controls.update();
};

const exportOBJ = () => {
  if (!sourceImage) return;
  // Export the same positions the preview renders.
  const objText = new OBJExporter().parse(lithoMesh);
  const blob = new Blob([objText], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "lithophane.obj";
  a.click();
  URL.revokeObjectURL(url);
};

const syncResolution = (value) => {
  const safe = Math.max(5, Math.min(100, Number(value || 35)));
  resolutionInput.value = String(safe);
  resolutionNumberInput.value = String(safe);
  rebuildGeometry();
};

const syncThicknessLabels = () => {
  const minV = Number(minThicknessInput.value || 1.2);
  let maxV = Number(maxThicknessInput.value || 6.5);
  if (maxV <= minV) {
    maxV = minV + 0.1;
    maxThicknessInput.value = maxV.toFixed(1);
  }
  minThicknessValue.textContent = `${minV.toFixed(1)} mm`;
  maxThicknessValue.textContent = `${maxV.toFixed(1)} mm`;
  rebuildGeometry();
};

uploadInput.addEventListener("change", async (event) => {
  const request = ++imageRequest;
  const files = [...(event.target.files || [])];
  if (!files.length) {
    imageStatus.textContent = "";
    return;
  }
  imageStatus.textContent = "Loading images…";
  try {
    const image = await combineImagesHorizontally(files, request);
    if (!image || request !== imageRequest) return;
    sourceImage = image;
    rebuildGeometry();
    fitCameraToMesh();
    downloadButton.disabled = false;
    imageStatus.textContent = image.downscaled
      ? `Images resized to ${image.width} × ${image.height} pixels for this preview.`
      : "";
  } catch (error) {
    if (request !== imageRequest) return;
    uploadInput.value = "";
    imageStatus.textContent = "Could not load these images. Try a supported image format or a smaller selection.";
    console.warn("Could not load lithophane images:", error);
  }
});

resolutionInput.addEventListener("input", () => syncResolution(resolutionInput.value));
resolutionNumberInput.addEventListener("change", () => syncResolution(resolutionNumberInput.value));
minThicknessInput.addEventListener("input", syncThicknessLabels);
maxThicknessInput.addEventListener("input", syncThicknessLabels);
downloadButton.addEventListener("click", exportOBJ);
resetViewButton.addEventListener("click", fitCameraToMesh);

const resize = () => {
  const width = Math.max(320, mount.clientWidth);
  const height = Math.max(340, mount.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

window.addEventListener("resize", resize);

const animate = () => {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
};

syncResolution(resolutionInput.value);
syncThicknessLabels();
resize();
animate();

(() => {
  const modelContext = document.modelContext || navigator.modelContext;
  if (typeof modelContext?.registerTool !== "function") return;

  const inputs = {
    resolutionPercent: resolutionInput,
    minThicknessMm: minThicknessInput,
    maxThicknessMm: maxThicknessInput
  };
  const limits = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [
    key, { min: Number(input.min), max: Number(input.max), step: Number(input.step) }
  ]));
  const getState = () => {
    const mesh = sourceImage ? computeMeshBudget(normalizedResolution()) : null;
    return {
      demo: "lithophane",
      parameters: Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, Number(input.value)])),
      limits,
      imageLoaded: Boolean(sourceImage),
      imageSize: sourceImage ? { width: sourceImage.width, height: sourceImage.height, downscaled: sourceImage.downscaled } : null,
      segments: mesh ? { sx: mesh.sx, sy: mesh.sy } : null,
      vertices: mesh?.vertices ?? null,
      appliedResolutionPercent: mesh?.appliedResolutionPercent ?? null,
      resolutionLimited: mesh?.limited ?? false,
      meshVertexLimit: MAX_MESH_VERTICES
    };
  };

  const tools = [
    {
      name: "get_demo_state",
      description: "Read the lithophane preview settings, slider limits, and mesh segment counts.",
      annotations: { readOnlyHint: true },
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: getState
    },
    {
      name: "set_demo_parameters",
      description: "Adjust lithophane preview resolution or thickness in the current tab. Returns the applied settings.",
      inputSchema: {
        type: "object",
        properties: Object.fromEntries(Object.entries(limits).map(([key, { min, max }]) => [
          key, { type: "number", minimum: min, maximum: max }
        ])),
        minProperties: 1,
        additionalProperties: false
      },
      execute: (requested = {}) => {
        const updates = Object.entries(requested);
        if (!updates.length) return { error: "Provide at least one preview parameter." };

        for (const [key, value] of updates) {
          if (!Object.hasOwn(inputs, key)) return { error: "Unknown preview parameter: " + key };
          const { min, max, step } = limits[key];
          const steps = (value - min) / step;
          if (!Number.isFinite(value) || value < min || value > max || Math.abs(steps - Math.round(steps)) > 1e-7) {
            return { error: `${key} must be between ${min} and ${max} in steps of ${step}.` };
          }
        }

        const next = { ...getState().parameters, ...requested };
        if (next.maxThicknessMm <= next.minThicknessMm) {
          return { error: "Maximum thickness must exceed minimum thickness." };
        }

        for (const [key, value] of updates) inputs[key].value = String(value);
        resolutionNumberInput.value = resolutionInput.value;
        syncThicknessLabels();
        return getState();
      }
    }
  ];

  let controller;
  const register = () => {
    controller = new AbortController();
    for (const tool of tools) {
      try {
        Promise.resolve(modelContext.registerTool(tool, { signal: controller.signal }))
          .catch((error) => console.warn(`WebMCP registration failed: ${tool.name}`, error));
      } catch (error) {
        console.warn(`WebMCP registration failed: ${tool.name}`, error);
      }
    }
  };
  register();
  window.addEventListener("pagehide", () => controller.abort());
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) register();
  });
})();
