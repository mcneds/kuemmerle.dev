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

const textureCanvas = document.createElement("canvas");
const textureContext = textureCanvas.getContext("2d", { willReadFrequently: true });
if (!textureContext) {
  throw new Error("Could not create 2D canvas context for texture preprocessing.");
}

let sourceTexture = null;
let sourceImageWidth = 1024;
let sourceImageHeight = 512;
let baseScale = 0.08;

const defaultTexture = new THREE.DataTexture(new Uint8Array([180, 180, 180, 255]), 1, 1);
defaultTexture.colorSpace = THREE.SRGBColorSpace;
defaultTexture.needsUpdate = true;

const geometryState = {
  width: 120,
  height: 70,
  depth: 8
};

const lithoMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTexture: { value: defaultTexture },
    minHeight: { value: 1.2 },
    maxHeight: { value: 6.5 }
  },
  vertexShader: `
    uniform sampler2D uTexture;
    uniform float minHeight;
    uniform float maxHeight;

    varying vec2 vUv;
    varying float vShade;

    void main() {
      vUv = uv;
      bool isTopFace = normal.y > 0.9;
      float sampleValue = texture2D(uTexture, uv).r;
      float displacement = mix(minHeight, maxHeight, sampleValue) * sampleValue;
      vec3 displaced = position + (isTopFace ? normal * displacement : vec3(0.0));
      vShade = sampleValue;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vShade;
    void main() {
      vec3 base = mix(vec3(0.08, 0.1, 0.14), vec3(0.88, 0.9, 0.95), vShade);
      gl_FragColor = vec4(base, 1.0);
    }
  `
});

let lithoMesh = new THREE.Mesh(new THREE.BoxGeometry(120, 8, 70, 30, 30, 30), lithoMaterial);
lithoMesh.castShadow = true;
lithoMesh.receiveShadow = true;
scene.add(lithoMesh);

const readImages = (files) =>
  Promise.all(
    files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = String(reader.result || "");
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    )
  );

const combineImagesHorizontally = async (files) => {
  const images = await readImages(files);
  if (!images.length) return null;

  const maxHeight = Math.max(...images.map((img) => img.height));
  const pad = 12;
  const totalWidth = images.reduce((sum, img) => sum + Math.round((img.width * maxHeight) / img.height), 0) + pad * 2;

  textureCanvas.width = totalWidth;
  textureCanvas.height = maxHeight + pad * 2;
  textureContext.fillStyle = "#000000";
  textureContext.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

  let cursorX = pad;
  for (const img of images) {
    const drawWidth = Math.round((img.width * maxHeight) / img.height);
    textureContext.drawImage(img, cursorX, pad, drawWidth, maxHeight);
    cursorX += drawWidth;
  }

  sourceImageWidth = textureCanvas.width;
  sourceImageHeight = textureCanvas.height;
  baseScale = 0.082;

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  sourceTexture = texture;
  lithoMaterial.uniforms.uTexture.value = sourceTexture;
  lithoMaterial.needsUpdate = true;
  downloadButton.disabled = false;
  rebuildGeometry();
  fitCameraToMesh();
  return texture;
};

const normalizedResolution = () => Math.max(5, Math.min(100, Number(resolutionInput.value || 35)));

const computeSegments = () => {
  const pct = normalizedResolution() / 100;
  const sx = Math.max(1, Math.floor(sourceImageWidth * pct));
  const sy = Math.max(1, Math.floor(sourceImageHeight * pct));
  return { sx, sy };
};

const rebuildGeometry = () => {
  if (!sourceTexture) {
    updateStats(0, 0);
    return;
  }
  const { sx, sy } = computeSegments();
  const width = sourceImageWidth * baseScale;
  const depth = sourceImageHeight * baseScale;
  const minT = Number(minThicknessInput.value || 1.2);
  const maxT = Number(maxThicknessInput.value || 6.5);
  const safeMax = Math.max(maxT, minT + 0.1);
  const avgThickness = minT + (safeMax - minT) * 0.45;

  geometryState.width = width;
  geometryState.height = avgThickness;
  geometryState.depth = depth;

  const newGeom = new THREE.BoxGeometry(width, avgThickness, depth, sx, sy, sx);
  lithoMesh.geometry.dispose();
  lithoMesh.geometry = newGeom;
  lithoMaterial.uniforms.minHeight.value = minT;
  lithoMaterial.uniforms.maxHeight.value = safeMax;
  updateStats(sx, sy);
};

const updateStats = (sx, sy) => {
  if (!sx || !sy) {
    statsEl.innerHTML = "<div>Segments: -- x --</div><div>Vertices: --</div>";
    return;
  }
  const vertices = (sx + 1) * (sy + 1);
  statsEl.innerHTML = `<div>Segments: ${sx} x ${sy}</div><div>Vertices: ${vertices.toLocaleString()}</div>`;
};

const fitCameraToMesh = () => {
  const box = new THREE.Box3().setFromObject(lithoMesh);
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  const distance = Math.max(120, sphere.radius * 2.9);
  camera.position.set(sphere.center.x + distance * 0.35, sphere.center.y + distance * 0.5, sphere.center.z + distance);
  controls.target.copy(sphere.center);
  controls.update();
};

const sampleLuminance = (xNorm, yNorm, rawImageData) => {
  const x = Math.max(0, Math.min(rawImageData.width - 1, Math.floor(xNorm * (rawImageData.width - 1))));
  const y = Math.max(0, Math.min(rawImageData.height - 1, Math.floor(yNorm * (rawImageData.height - 1))));
  const idx = (y * rawImageData.width + x) * 4;
  return rawImageData.data[idx] / 255;
};

const buildExportMesh = () => {
  if (!sourceTexture) return null;
  const geometry = lithoMesh.geometry.clone();
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;
  if (!bbox) return null;

  const topY = bbox.max.y;
  const pos = geometry.getAttribute("position");
  const minT = Number(minThicknessInput.value || 1.2);
  const maxT = Math.max(Number(maxThicknessInput.value || 6.5), minT + 0.1);
  const imageData = textureContext.getImageData(0, 0, textureCanvas.width, textureCanvas.height);

  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    if (Math.abs(y - topY) > 0.02) continue;
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const xNorm = (x - bbox.min.x) / (bbox.max.x - bbox.min.x || 1);
    const zNorm = (z - bbox.min.z) / (bbox.max.z - bbox.min.z || 1);
    const lum = sampleLuminance(xNorm, zNorm, imageData);
    const displacement = minT + lum * (maxT - minT);
    pos.setY(i, y + displacement * lum);
  }

  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xffffff }));
};

const exportOBJ = () => {
  const exportMesh = buildExportMesh();
  if (!exportMesh) return;
  const exporter = new OBJExporter();
  const objText = exporter.parse(exportMesh);
  const blob = new Blob([objText], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "lithophane.obj";
  a.click();
  URL.revokeObjectURL(url);
  exportMesh.geometry.dispose();
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
  const files = [...(event.target.files || [])].filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;
  await combineImagesHorizontally(files);
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
fitCameraToMesh();
resize();
animate();
