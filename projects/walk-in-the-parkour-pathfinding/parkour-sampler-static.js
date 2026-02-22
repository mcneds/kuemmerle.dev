import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const mount = document.getElementById("pkStaticSampler");
const reachInput = document.getElementById("pkStaticReach");
const peakInput = document.getElementById("pkStaticPeak");
const spreadInput = document.getElementById("pkStaticSpread");
const spinButton = document.getElementById("pkStaticSpin");
const sampleButton = document.getElementById("pkStaticSample");
const resetButton = document.getElementById("pkStaticReset");

if (!mount) {
  throw new Error("Static sampler mount node not found.");
}

const BLOCK_SIZE = 2.4;
const HEIGHT_STEP = 1.18;
const MIN_HEIGHT = -2.4;

const settings = {
  radius: Number(reachInput?.value || 12.5),
  peak: Number(peakInput?.value || 4.3),
  spread: Number(spreadInput?.value || 4),
  spin: true
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 200);
camera.position.set(17, 12, 17);
camera.lookAt(0, 2, 5.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setClearColor(0x000000, 0);
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xb7d4ff, 0x11182b, 0.72));
const rimLight = new THREE.DirectionalLight(0xffffff, 0.58);
rimLight.position.set(16, 20, 12);
scene.add(rimLight);

const root = new THREE.Group();
scene.add(root);

const axis = new THREE.AxesHelper(3.8);
axis.material.opacity = 0.28;
axis.material.transparent = true;
root.add(axis);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.1, 5.4);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = true;
controls.enableZoom = true;
controls.enableRotate = true;
controls.minDistance = 7;
controls.maxDistance = 44;
controls.autoRotate = settings.spin;
controls.autoRotateSpeed = 0.85;
controls.minPolarAngle = 0.05;
controls.maxPolarAngle = Math.PI - 0.05;
controls.update();

const defaultCameraPosition = new THREE.Vector3(17, 12, 17);
const defaultTarget = new THREE.Vector3(0, 2.1, 5.4);

const createParaboloidGeometry = (
  radius,
  peakHeight,
  minHeight,
  radialSegments = 58,
  ringSegments = 40,
  thetaStart = 0,
  thetaLength = Math.PI
) => {
  const clampedPeak = Math.max(minHeight + 0.4, peakHeight);
  const clampedRadius = Math.max(3, radius);
  const ySpan = clampedPeak - minHeight;
  const positions = [];
  const indices = [];

  for (let ring = 0; ring <= ringSegments; ring += 1) {
    const t = ring / ringSegments;
    const y = clampedPeak - ySpan * t;
    const normalized = THREE.MathUtils.clamp((clampedPeak - y) / ySpan, 0, 1);
    const ringRadius = clampedRadius * Math.sqrt(normalized);
    for (let seg = 0; seg <= radialSegments; seg += 1) {
      const ang = thetaStart + (seg / radialSegments) * thetaLength;
      positions.push(Math.cos(ang) * ringRadius, y, Math.sin(ang) * ringRadius);
    }
  }

  const stride = radialSegments + 1;
  for (let ring = 0; ring < ringSegments; ring += 1) {
    for (let seg = 0; seg < radialSegments; seg += 1) {
      const a = ring * stride + seg;
      const b = a + stride;
      const c = b + 1;
      const d = a + 1;
      indices.push(a, b, d, b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
};

let shellMesh = null;
let shellWire = null;
let gridMesh = null;
let chosenMesh = null;
const tmpMatrix = new THREE.Matrix4();

const clearObject = (obj) => {
  if (!obj) return;
  root.remove(obj);
  obj.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      if (Array.isArray(node.material)) node.material.forEach((m) => m.dispose());
      else node.material.dispose();
    }
  });
};

const buildCandidateOffsets = () => {
  const result = [];
  for (let dz = 1; dz <= 9; dz += 1) {
    for (let dx = -4; dx <= 4; dx += 1) {
      const side = Math.abs(dx) / settings.spread;
      const dy = Math.round(2.8 - dz * 0.32 - side * 1.6);
      if (dy < -2 || dy > 3) continue;
      if ((dx + dz) % 2 === 0) continue;
      result.push({ dx, dy, dz });
    }
  }
  return result;
};

let highlightedSampleIndex = 0.7;

const rebuildSampler = () => {
  clearObject(shellMesh);
  clearObject(shellWire);
  clearObject(gridMesh);
  clearObject(chosenMesh);

  const shellGeom = createParaboloidGeometry(settings.radius, settings.peak, MIN_HEIGHT);
  shellMesh = new THREE.Mesh(
    shellGeom,
    new THREE.MeshStandardMaterial({
      color: 0x7baeff,
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      roughness: 0.52,
      metalness: 0.14
    })
  );
  shellWire = new THREE.LineSegments(
    new THREE.WireframeGeometry(shellGeom),
    new THREE.LineBasicMaterial({ color: 0x7baeff, transparent: true, opacity: 0.32 })
  );
  root.add(shellMesh);
  root.add(shellWire);

  const candidateOffsets = buildCandidateOffsets();
  gridMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.34, 0.34, 0.34),
    new THREE.MeshStandardMaterial({
      color: 0x6b9eff,
      emissive: 0x0b1f4f,
      emissiveIntensity: 0.26,
      transparent: true,
      opacity: 0.6,
      roughness: 0.4,
      metalness: 0.05
    }),
    candidateOffsets.length
  );
  candidateOffsets.forEach((sample, index) => {
    tmpMatrix.makeTranslation(sample.dx * BLOCK_SIZE, sample.dy * HEIGHT_STEP, sample.dz * BLOCK_SIZE);
    gridMesh.setMatrixAt(index, tmpMatrix);
  });
  gridMesh.instanceMatrix.needsUpdate = true;
  root.add(gridMesh);

  const chosenOffset = candidateOffsets[Math.floor(candidateOffsets.length * highlightedSampleIndex)] || { dx: 1, dy: 1, dz: 6 };
  chosenMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.55, 0.55),
    new THREE.MeshStandardMaterial({
      color: 0xffcd57,
      emissive: 0xa66c00,
      emissiveIntensity: 0.95,
      roughness: 0.28,
      metalness: 0.22
    })
  );
  chosenMesh.position.set(
    chosenOffset.dx * BLOCK_SIZE,
    chosenOffset.dy * HEIGHT_STEP,
    chosenOffset.dz * BLOCK_SIZE
  );
  root.add(chosenMesh);
};

const originMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.7, 0.7, 0.7),
  new THREE.MeshStandardMaterial({
    color: 0x85ffc1,
    emissive: 0x0e4f2d,
    emissiveIntensity: 0.7,
    roughness: 0.35,
    metalness: 0.12
  })
);
originMesh.position.set(0, 0, 0);
root.add(originMesh);

const resize = () => {
  const width = Math.max(200, mount.clientWidth);
  const height = Math.max(160, mount.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
};
resize();

const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(mount);

const bindRange = (input, key) => {
  if (!input) return;
  input.addEventListener("input", () => {
    settings[key] = Number(input.value);
    rebuildSampler();
  });
};

bindRange(reachInput, "radius");
bindRange(peakInput, "peak");
bindRange(spreadInput, "spread");

if (spinButton) {
  spinButton.addEventListener("click", () => {
    settings.spin = !settings.spin;
    controls.autoRotate = settings.spin;
    spinButton.textContent = settings.spin ? "Spin On" : "Spin Off";
    spinButton.setAttribute("aria-pressed", settings.spin ? "true" : "false");
  });
}

if (sampleButton) {
  sampleButton.addEventListener("click", () => {
    highlightedSampleIndex = Math.random();
    rebuildSampler();
  });
}

if (resetButton) {
  resetButton.addEventListener("click", () => {
    camera.position.copy(defaultCameraPosition);
    controls.target.copy(defaultTarget);
    controls.update();
  });
}

rebuildSampler();

const animate = () => {
  controls.update();
  if (chosenMesh) {
    chosenMesh.material.emissiveIntensity = 0.8 + Math.sin(performance.now() * 0.01) * 0.25;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};
animate();
