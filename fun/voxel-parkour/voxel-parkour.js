import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const mount = document.getElementById("parkourViewport");
const viewportWrap = document.querySelector(".parkourViewportWrap");
const distanceEl = document.getElementById("pkDistance");
const bestEl = document.getElementById("pkBest");
const hintEl = document.getElementById("pkHint");
const restartButton = document.getElementById("pkRestart");
const fullscreenButton = document.getElementById("pkFullscreen");
const touchJumpButton = document.getElementById("pkTouchJump");
const touchLookPad = document.getElementById("pkTouchLook");
const maxSeparationEl = document.getElementById("pkMaxSeparation");
const difficultyInput = document.getElementById("pkDifficulty");
const difficultyValueEl = document.getElementById("pkDifficultyValue");
const minSeparationInput = document.getElementById("pkMinSeparation");
const minSeparationValueEl = document.getElementById("pkMinSeparationValue");
const futureJumpsInput = document.getElementById("pkFutureJumps");
const futureJumpsValueEl = document.getElementById("pkFutureJumpsValue");
const moveSpeedInput = document.getElementById("pkMoveSpeed");
const moveSpeedValueEl = document.getElementById("pkMoveSpeedValue");
const jumpSpeedInput = document.getElementById("pkJumpSpeed");
const jumpSpeedValueEl = document.getElementById("pkJumpSpeedValue");
const gravityInput = document.getElementById("pkGravity");
const gravityValueEl = document.getElementById("pkGravityValue");
const airDragInput = document.getElementById("pkAirDrag");
const airDragValueEl = document.getElementById("pkAirDragValue");
const thresholdInput = document.getElementById("pkThreshold");
const thresholdValueEl = document.getElementById("pkThresholdValue");
const samplerMount = document.getElementById("pkSamplerViewport") || document.createElement("div");
const samplerCard = document.getElementById("pkSamplerCard");
const samplerSizeButton = document.getElementById("pkSamplerSize");
const samplerRotateButton = document.getElementById("pkSamplerRotate");

if (
  !mount ||
  !viewportWrap ||
  !distanceEl ||
  !bestEl ||
  !hintEl ||
  !restartButton ||
  !fullscreenButton ||
  !touchJumpButton ||
  !touchLookPad ||
  !maxSeparationEl ||
  !difficultyInput ||
  !difficultyValueEl ||
  !minSeparationInput ||
  !minSeparationValueEl ||
  !futureJumpsInput ||
  !futureJumpsValueEl ||
  !moveSpeedInput ||
  !moveSpeedValueEl ||
  !jumpSpeedInput ||
  !jumpSpeedValueEl ||
  !gravityInput ||
  !gravityValueEl ||
  !airDragInput ||
  !airDragValueEl ||
  !thresholdInput ||
  !thresholdValueEl
) {
  throw new Error("Voxel parkour page is missing required UI nodes.");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060b14);
scene.fog = new THREE.Fog(0x060b14, 50, 240);

const camera = new THREE.PerspectiveCamera(64, 1, 0.1, 2000);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(mount.clientWidth, mount.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
mount.appendChild(renderer.domElement);

const samplerScene = new THREE.Scene();
const samplerCamera = new THREE.PerspectiveCamera(44, 1, 0.1, 500);
samplerCamera.position.set(18, 12, 18);
samplerCamera.lookAt(0, 2.5, 8);

const samplerRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
samplerRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
samplerRenderer.setSize(Math.max(180, samplerMount.clientWidth), Math.max(160, samplerMount.clientHeight));
samplerRenderer.outputColorSpace = THREE.SRGBColorSpace;
samplerRenderer.toneMapping = THREE.ACESFilmicToneMapping;
samplerRenderer.toneMappingExposure = 1.0;
samplerRenderer.setClearColor(0x000000, 0);
samplerMount.appendChild(samplerRenderer.domElement);

samplerScene.add(new THREE.HemisphereLight(0xb7d4ff, 0x11182b, 0.7));
const samplerRim = new THREE.DirectionalLight(0xffffff, 0.58);
samplerRim.position.set(16, 20, 12);
samplerScene.add(samplerRim);

const samplerRoot = new THREE.Group();
samplerScene.add(samplerRoot);

const samplerAxis = new THREE.AxesHelper(3.8);
samplerAxis.material.opacity = 0.28;
samplerAxis.material.transparent = true;
samplerRoot.add(samplerAxis);

const samplerTmpMatrix = new THREE.Matrix4();
let samplerParaboloidMesh = null;
let samplerGridMesh = null;
let samplerChosenMesh = null;

const samplerControls = new OrbitControls(samplerCamera, samplerRenderer.domElement);
samplerControls.target.set(0, 2.1, 5.4);
samplerControls.enableDamping = true;
samplerControls.dampingFactor = 0.08;
samplerControls.enablePan = true;
samplerControls.enableZoom = true;
samplerControls.enableRotate = true;
samplerControls.minDistance = 7;
samplerControls.maxDistance = 44;
samplerControls.autoRotate = true;
samplerControls.autoRotateSpeed = 0.85;
samplerControls.minPolarAngle = 0.05;
samplerControls.maxPolarAngle = Math.PI - 0.05;
samplerControls.update();

scene.add(new THREE.HemisphereLight(0xbdd7ff, 0x1a2029, 0.46));

const sun = new THREE.DirectionalLight(0xffffff, 1.05);
sun.position.set(26, 30, -10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const rim = new THREE.DirectionalLight(0x8fb8ff, 0.5);
rim.position.set(-18, 14, 28);
scene.add(rim);

const ambientFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(520, 520),
  new THREE.MeshStandardMaterial({ color: 0x0e1320, roughness: 0.95, metalness: 0.02 })
);
ambientFloor.rotation.x = -Math.PI / 2;
ambientFloor.position.y = -5;
ambientFloor.receiveShadow = true;
scene.add(ambientFloor);

const BLOCK_SIZE = 2.4;
const BLOCK_HEIGHT = 1.0;
const HEIGHT_STEP = 1.18;
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.34;
const EYE_OFFSET = 0.68;

const settings = {
  difficulty: 58,
  minSeparation: 34,
  futureJumps: 28,
  moveSpeed: 10.2,
  jumpSpeed: 11.2,
  gravityMagnitude: 30,
  airRetainPerSec: 0.97,
  jumpTightness: 52
};

const FADE_START_DISTANCE = 20;
const FADE_DURATION = 1.3;
const DESPAWN_DISTANCE = 42;
const SPARSE_SAMPLE_COUNT = 220;
const TRACK_TARGET_Y = 0;
const TRACK_MIN_Y = -2;
const TRACK_MAX_Y = 10;
const GROUND_ACCEL_RESPONSE = 30;
const GROUND_BRAKE_RESPONSE = 70;
const GROUND_FRICTION = 10.5;
const AIR_STEER_ACCEL = 2.4;
const SNEAK_SPEED_MULTIPLIER = 0.38;
const SNEAK_EDGE_MARGIN = 0.1;

const desktopLookSensitivity = 0.0022;
const touchLookSensitivity = 0.0043;

const isTouchPrimary = window.matchMedia("(pointer: coarse)").matches;

const blockGeom = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_HEIGHT, BLOCK_SIZE);
const blocks = [];

const player = {
  position: new THREE.Vector3(0, 2.2, 0),
  velocity: new THREE.Vector3(),
  horizontalVelocity: new THREE.Vector3(),
  grounded: false,
  lastSafePosition: new THREE.Vector3(0, 2.2, 0),
  bestDistance: Number(localStorage.getItem("voxel_parkour_best") || "0")
};
bestEl.textContent = String(player.bestDistance);

let yaw = Math.PI;
let pitch = -0.03;
let cursorLocked = false;
let jumpQueued = false;
let mobileForwardHeld = false;
let spawnCount = 0;
let previousStepDelta = { dx: 0, dz: 1 };
let repeatedHeadingCount = 0;
let samplerLarge = false;
let samplerSpinEnabled = true;
const recentSxHistory = [];
const RECENT_SX_MEMORY = 10;

let lastNode = { sx: 0, sy: 0, sz: 1 };

const keys = new Set();
const moveForwardVector = new THREE.Vector3();
const moveRightVector = new THREE.Vector3();
const moveWorld = new THREE.Vector3();
const WORLD_UP = new THREE.Vector3(0, 1, 0);
let touchLookPrimaryId = null;
let touchLookLastX = 0;
let touchLookLastY = 0;
const touchLookPointers = new Map();
const syncMobileForwardFromLookTouches = () => {
  mobileForwardHeld = isTouchPrimary && touchLookPointers.size >= 2;
};
const clearTransientInput = () => {
  keys.clear();
  mobileForwardHeld = false;
  touchLookPrimaryId = null;
  touchLookPointers.clear();
  jumpQueued = false;
};
const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const worldFromStep = (sx, sy, sz) =>
  new THREE.Vector3(sx * BLOCK_SIZE, sy * HEIGHT_STEP + BLOCK_HEIGHT * 0.5, sz * BLOCK_SIZE);
const isSneaking = () => keys.has("ShiftLeft") || keys.has("ShiftRight");

const hasSupportAt = (x, z, feetY, margin = 0) => {
  for (const block of blocks) {
    if (block.fading && !block.startBlock) continue;
    const limitX = Math.max(0.01, block.halfW - (PLAYER_RADIUS + margin));
    const limitZ = Math.max(0.01, block.halfD - (PLAYER_RADIUS + margin));
    if (Math.abs(x - block.mesh.position.x) > limitX) continue;
    if (Math.abs(z - block.mesh.position.z) > limitZ) continue;
    if (Math.abs(feetY - block.topY) <= 0.26) {
      return true;
    }
  }
  return false;
};

const gravityValue = () => -settings.gravityMagnitude;
const dragConstant = () => {
  const retain = clamp(settings.airRetainPerSec, 0.7, 0.99999);
  return -Math.log(retain);
};

const generationLaunchSpeed = () => {
  const tightness = clamp(settings.jumpTightness / 100, 0, 1);
  // Higher tightness slightly lowers effective launch profile, but does not collapse reach.
  return settings.moveSpeed * clamp(1.02 - tightness * 0.32, 0.55, 1.1);
};

const landingAllowance = () => {
  const tightness = clamp(settings.jumpTightness / 100, 0, 1);
  // Lower tightness allows broader "any-part-of-block" accessibility margin.
  return BLOCK_SIZE * (0.55 + (1 - tightness) * 0.8);
};

const flightTimeForDeltaY = (deltaY) => {
  const g = gravityValue();
  const v0 = settings.jumpSpeed;
  const discriminant = v0 * v0 + 2 * g * deltaY;
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  const t1 = (-v0 + root) / g;
  const t2 = (-v0 - root) / g;
  const times = [t1, t2].filter((t) => t > 0);
  if (!times.length) return null;
  return Math.max(...times);
};

const maxHorizontalReachForDeltaY = (deltaY) => {
  const t = flightTimeForDeltaY(deltaY);
  if (!t) return 0;
  const v0 = generationLaunchSpeed();
  const k = dragConstant();
  const raw = k < 1e-4 ? v0 * t : (v0 * (1 - Math.exp(-k * t))) / k;
  return Math.max(0, raw);
};

const difficultyRange = () => {
  const d = clamp(settings.difficulty / 100, 0, 1);
  return {
    maxRatio: 0.78 + d * 0.2
  };
};

const minimumSeparationRatio = () => clamp(settings.minSeparation / 100, 0, 0.94);

const maxJumpHeightMeters = () => {
  const g = settings.gravityMagnitude;
  if (g <= 0.001) return 0;
  return (settings.jumpSpeed * settings.jumpSpeed) / (2 * g);
};

const updateMaxSeparationDisplay = () => {
  const maxSameHeight = maxHorizontalReachForDeltaY(0) + landingAllowance();
  const range = difficultyRange();
  const allowed = maxSameHeight * range.maxRatio;
  const blocksWide = allowed / BLOCK_SIZE;
  maxSeparationEl.textContent = `${allowed.toFixed(1)}m (${blocksWide.toFixed(1)}b)`;
};

const createParaboloidGeometry = (
  radius,
  peakHeight,
  minHeight,
  radialSegments = 46,
  ringSegments = 36,
  thetaStart = 0,
  thetaLength = Math.PI * 2
) => {
  const clampedPeak = Math.max(minHeight + 0.4, peakHeight);
  const clampedRadius = Math.max(3, radius);
  const ySpan = clampedPeak - minHeight;
  const positions = [];
  const indices = [];

  for (let ring = 0; ring <= ringSegments; ring += 1) {
    const t = ring / ringSegments;
    const y = clampedPeak - ySpan * t;
    const normalized = clamp((clampedPeak - y) / ySpan, 0, 1);
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

const clearSamplerMesh = (mesh) => {
  if (!mesh) return;
  samplerRoot.remove(mesh);
  mesh.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      if (Array.isArray(node.material)) {
        for (const mat of node.material) mat.dispose();
      } else {
        node.material.dispose();
      }
    }
  });
};

const refreshSamplerParaboloid = () => {
  clearSamplerMesh(samplerParaboloidMesh);
  samplerParaboloidMesh = null;

  const maxReach = Math.max(5, maxHorizontalReachForDeltaY(0) + landingAllowance());
  const peak = Math.max(1.8, maxJumpHeightMeters() + HEIGHT_STEP * 0.45);
  const minHeight = TRACK_MIN_Y * HEIGHT_STEP;

  const shell = new THREE.Mesh(
    createParaboloidGeometry(maxReach, peak, minHeight, 58, 40, 0, Math.PI),
    new THREE.MeshStandardMaterial({
      color: 0x7baeff,
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      roughness: 0.52,
      metalness: 0.14
    })
  );

  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(shell.geometry),
    new THREE.LineBasicMaterial({ color: 0x7baeff, transparent: true, opacity: 0.32 })
  );

  samplerParaboloidMesh = new THREE.Group();
  samplerParaboloidMesh.add(shell);
  samplerParaboloidMesh.add(wire);
  samplerRoot.add(samplerParaboloidMesh);
};

const updateSamplerPreview = (candidateOffsets, chosenOffset) => {
  if (samplerGridMesh) {
    samplerRoot.remove(samplerGridMesh);
    samplerGridMesh.geometry.dispose();
    samplerGridMesh.material.dispose();
    samplerGridMesh = null;
  }
  if (samplerChosenMesh) {
    samplerRoot.remove(samplerChosenMesh);
    samplerChosenMesh.geometry.dispose();
    samplerChosenMesh.material.dispose();
    samplerChosenMesh = null;
  }

  if (candidateOffsets.length) {
    const gridGeom = new THREE.BoxGeometry(0.34, 0.34, 0.34);
    const gridMat = new THREE.MeshStandardMaterial({
      color: 0x6b9eff,
      emissive: 0x0b1f4f,
      emissiveIntensity: 0.26,
      transparent: true,
      opacity: 0.6,
      roughness: 0.4,
      metalness: 0.05
    });
    samplerGridMesh = new THREE.InstancedMesh(gridGeom, gridMat, candidateOffsets.length);
    samplerGridMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    candidateOffsets.forEach((sample, index) => {
      samplerTmpMatrix.makeTranslation(sample.dx * BLOCK_SIZE, sample.dy * HEIGHT_STEP, sample.dz * BLOCK_SIZE);
      samplerGridMesh.setMatrixAt(index, samplerTmpMatrix);
    });
    samplerGridMesh.instanceMatrix.needsUpdate = true;
    samplerRoot.add(samplerGridMesh);
  }

  if (chosenOffset) {
    samplerChosenMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.55, 0.55),
      new THREE.MeshStandardMaterial({
        color: 0xffcd57,
        emissive: 0xa66c00,
        emissiveIntensity: 0.95,
        roughness: 0.28,
        metalness: 0.22
      })
    );
    samplerChosenMesh.position.set(
      chosenOffset.dx * BLOCK_SIZE,
      chosenOffset.dy * HEIGHT_STEP,
      chosenOffset.dz * BLOCK_SIZE
    );
    samplerRoot.add(samplerChosenMesh);
  }
};

const createBlock = ({ sx, sy, sz, xScale = 1, zScale = 1, startBlock = false }) => {
  const color = new THREE.Color().setHSL(0.6 - sy * 0.012, 0.52, clamp(0.58 + sy * 0.03, 0.35, 0.72));
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.57,
    metalness: 0.08,
    transparent: true,
    opacity: 1
  });
  const mesh = new THREE.Mesh(blockGeom, material);
  mesh.position.copy(worldFromStep(sx, sy, sz));
  mesh.scale.set(xScale, 1, zScale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const halfW = BLOCK_SIZE * 0.5 * xScale;
  const halfD = BLOCK_SIZE * 0.5 * zScale;
  const topY = mesh.position.y + BLOCK_HEIGHT * 0.5;

  blocks.push({
    sx,
    sy,
    sz,
    mesh,
    halfW,
    halfD,
    topY,
    startBlock,
    fading: false,
    fadeElapsed: 0
  });
};

const buildReachableCandidates = () => {
  const early = spawnCount < 8;
  const d = clamp(settings.difficulty / 100, 0, 1);
  const range = difficultyRange();
  const sameHeightMax = maxHorizontalReachForDeltaY(0) + landingAllowance();
  const maxSteps = clamp(Math.floor(sameHeightMax / BLOCK_SIZE) + 1, 2, 12);
  const desiredMinForward = early ? 1 : Math.max(1, Math.round(1 + d * 1.8));
  const minForward = Math.max(1, Math.min(desiredMinForward, maxSteps));
  const maxForward = Math.max(minForward, maxSteps);
  const maxLateral = early
    ? Math.max(1, Math.min(2, maxForward))
    : Math.max(1, Math.floor(maxForward * (0.66 + d * 0.24)));
  const maxUp = early ? 1 : Math.max(1, Math.floor(1 + d * 2));
  const maxDown = early ? 1 : Math.max(1, Math.floor(1 + d * 2));
  const upwardBias = 0.55 + d * 0.3;
  const verticalCorrection = clamp((TRACK_TARGET_Y - lastNode.sy) * 0.12, -0.35, 0.45);
  const accepted = [];
  const sampledOffsets = [];
  const seen = new Set();
  const userMinRatio = minimumSeparationRatio();

  for (let i = 0; i < SPARSE_SAMPLE_COUNT; i += 1) {
    const dz = Math.floor(minForward + Math.random() * (maxForward - minForward + 1));
    const dx = Math.floor(-maxLateral + Math.random() * (2 * maxLateral + 1));
    let dy = Math.floor(-maxDown + Math.random() * (maxUp + maxDown + 1));

    if (Math.random() < upwardBias + verticalCorrection) dy += 1;
    dy = clamp(dy, -maxDown, maxUp);

    const sx = clamp(lastNode.sx + dx, -11, 11);
    const sy = clamp(lastNode.sy + dy, TRACK_MIN_Y, TRACK_MAX_Y);
    const sz = lastNode.sz + dz;
    const relDy = sy - lastNode.sy;
    const relX = sx - lastNode.sx;
    const relZ = sz - lastNode.sz;

    if (sy <= TRACK_MIN_Y && relDy < 0) continue;
    if (sx === lastNode.sx && sy === lastNode.sy && sz === lastNode.sz) continue;

    const horizontalDistance = Math.hypot(relX * BLOCK_SIZE, relZ * BLOCK_SIZE);
    // Discard dead zone around source block (space occupied by player and vertical column).
    if (horizontalDistance < BLOCK_SIZE * 1.22) continue;

    const deltaY = relDy * HEIGHT_STEP;
    const maxReach = maxHorizontalReachForDeltaY(deltaY) + landingAllowance();
    if (maxReach <= 0.35) continue;

    const ratio = horizontalDistance / maxReach;
    const minRatio = clamp(early ? userMinRatio * 0.5 : userMinRatio, 0.04, range.maxRatio - 0.06);
    const maxRatio = early ? 0.93 : range.maxRatio;
    if (ratio < minRatio || ratio > maxRatio) continue;

    const key = `${sx}|${sy}|${sz}`;
    if (seen.has(key)) continue;
    seen.add(key);
    accepted.push({ sx, sy, sz, dx: relX, dy: relDy, dz: relZ, ratio });
    sampledOffsets.push({ dx: relX, dy: relDy, dz: relZ });
  }

  return { accepted, sampledOffsets };
};

const buildFallbackCandidate = () => {
  const trials = 48;
  for (let i = 0; i < trials; i += 1) {
    const sx = clamp(lastNode.sx + randomPick([-3, -2, -1, 0, 1, 2, 3]), -11, 11);
    const sy = clamp(lastNode.sy + randomPick([-1, 0, 1]), TRACK_MIN_Y, TRACK_MAX_Y);
    const sz = lastNode.sz + randomPick([1, 2, 3, 4]);
    const dx = (sx - lastNode.sx) * BLOCK_SIZE;
    const dz = (sz - lastNode.sz) * BLOCK_SIZE;
    const horizontalDistance = Math.hypot(dx, dz);
    if (horizontalDistance < BLOCK_SIZE * 1.2) continue;
    const deltaY = (sy - lastNode.sy) * HEIGHT_STEP;
    const maxReach = maxHorizontalReachForDeltaY(deltaY) + landingAllowance();
    if (maxReach > 0.2 && horizontalDistance <= maxReach * 0.98) {
      return { sx, sy, sz, dx: sx - lastNode.sx, dy: sy - lastNode.sy, dz: sz - lastNode.sz };
    }
  }
  const sx = clamp(lastNode.sx + randomPick([-2, -1, 0, 1, 2]), -11, 11);
  const sy = clamp(lastNode.sy + randomPick([-1, 0, 1]), TRACK_MIN_Y, TRACK_MAX_Y);
  const sz = lastNode.sz + randomPick([1, 2]);
  return { sx, sy, sz, dx: sx - lastNode.sx, dy: sy - lastNode.sy, dz: sz - lastNode.sz };
};

const generateNextBlock = () => {
  const { accepted, sampledOffsets } = buildReachableCandidates();
  const previousLength = Math.hypot(previousStepDelta.dx, previousStepDelta.dz) || 1;
  let pick = null;

  if (accepted.length) {
    const scored = [];
    for (const candidate of accepted) {
      const candidateLength = Math.hypot(candidate.dx, candidate.dz) || 1;
      const headingSimilarity =
        (candidate.dx * previousStepDelta.dx + candidate.dz * previousStepDelta.dz) /
        (candidateLength * previousLength);
      const turnBonus = (1 - headingSimilarity) * 0.8;
      const lateralBonus = Math.min(1.3, Math.abs(candidate.dx) * 0.36);
      const verticalBonus = Math.min(0.75, Math.abs(candidate.dy) * 0.24);
      const centeredGap = 1 - Math.abs(candidate.ratio - 0.62);
      const antiRepeat = repeatedHeadingCount >= 2 ? (1 - headingSimilarity) * 0.9 : 0;
      const laneUsage = recentSxHistory.reduce((sum, sx) => sum + (sx === candidate.sx ? 1 : 0), 0);
      const lanePenalty = laneUsage * 0.2;
      const score = Math.random() * 0.34 + turnBonus + lateralBonus + verticalBonus + centeredGap + antiRepeat - lanePenalty;
      scored.push({ candidate, score });
    }

    scored.sort((a, b) => b.score - a.score);
    const topCount = Math.max(1, Math.floor(scored.length * 0.25));
    pick = randomPick(scored.slice(0, topCount)).candidate;
  }

  const fallback = !pick ? buildFallbackCandidate() : null;
  const next = pick ? { sx: pick.sx, sy: pick.sy, sz: pick.sz } : fallback;
  const chosenOffset = pick || fallback;
  updateSamplerPreview(sampledOffsets, chosenOffset);

  const stepDx = next.sx - lastNode.sx;
  const stepDz = next.sz - lastNode.sz;
  if (stepDx === previousStepDelta.dx && stepDz === previousStepDelta.dz) {
    repeatedHeadingCount += 1;
  } else {
    previousStepDelta = { dx: stepDx, dz: stepDz };
    repeatedHeadingCount = 0;
  }

  createBlock({ sx: next.sx, sy: next.sy, sz: next.sz });
  lastNode = next;
  spawnCount += 1;
  recentSxHistory.push(next.sx);
  while (recentSxHistory.length > RECENT_SX_MEMORY) recentSxHistory.shift();
};

const seedTrack = () => {
  createBlock({ sx: 0, sy: 0, sz: 0, xScale: 3, zScale: 3, startBlock: true });
  createBlock({ sx: 0, sy: 0, sz: 2, startBlock: true });
  createBlock({ sx: 0, sy: 0, sz: 4 });
  lastNode = { sx: 0, sy: 0, sz: 4 };
  spawnCount = 0;
  for (let i = 0; i < settings.futureJumps; i += 1) {
    generateNextBlock();
  }
};

const clearBlocks = () => {
  while (blocks.length) {
    const block = blocks.pop();
    scene.remove(block.mesh);
    block.mesh.material.dispose();
  }
};

const restartRun = () => {
  clearBlocks();
  seedTrack();
  player.position.set(0, BLOCK_HEIGHT + PLAYER_HEIGHT * 0.5 + 0.01, 0);
  player.velocity.set(0, 0, 0);
  player.horizontalVelocity.set(0, 0, 0);
  player.grounded = true;
  player.lastSafePosition.copy(player.position);
  // Spawn facing toward +Z where new jumps are generated.
  yaw = Math.PI;
  pitch = -0.03;
  previousStepDelta = { dx: 0, dz: 1 };
  repeatedHeadingCount = 0;
  recentSxHistory.length = 0;
  mobileForwardHeld = false;
  touchLookPrimaryId = null;
  touchLookPointers.clear();
  distanceEl.textContent = "0";
  hintEl.textContent = isTouchPrimary
    ? "Right side: 1 finger look, 2 fingers move. Left button is jump."
    : "Click inside the viewport to lock cursor and look around.";
};

const applyLookDelta = (dx, dy, sensitivity) => {
  yaw -= dx * sensitivity;
  pitch -= dy * sensitivity;
  pitch = clamp(pitch, -1.35, 1.35);
};

renderer.domElement.addEventListener("click", () => {
  if (isTouchPrimary) return;
  if (document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
  }
});

document.addEventListener("pointerlockchange", () => {
  cursorLocked = document.pointerLockElement === renderer.domElement;
  if (!cursorLocked) clearTransientInput();
  hintEl.textContent = cursorLocked
    ? "Cursor locked. Press ESC to release look."
    : "Click inside the viewport to lock cursor and look around.";
});

document.addEventListener("mousemove", (event) => {
  if (!cursorLocked) return;
  applyLookDelta(event.movementX, event.movementY, desktopLookSensitivity);
});

touchLookPad.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "touch") return;
  touchLookPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (touchLookPrimaryId === null) {
    touchLookPrimaryId = event.pointerId;
    touchLookLastX = event.clientX;
    touchLookLastY = event.clientY;
  }
  touchLookPad.setPointerCapture(event.pointerId);
  syncMobileForwardFromLookTouches();
});

touchLookPad.addEventListener("pointermove", (event) => {
  if (!touchLookPointers.has(event.pointerId)) return;
  touchLookPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (event.pointerId === touchLookPrimaryId) {
    const dx = event.clientX - touchLookLastX;
    const dy = event.clientY - touchLookLastY;
    touchLookLastX = event.clientX;
    touchLookLastY = event.clientY;
    applyLookDelta(dx, dy, touchLookSensitivity);
  }
});

const endTouchLook = (event) => {
  if (!touchLookPointers.has(event.pointerId)) return;
  touchLookPointers.delete(event.pointerId);
  if (event.pointerId === touchLookPrimaryId) {
    const next = touchLookPointers.entries().next();
    if (next.done) {
      touchLookPrimaryId = null;
    } else {
      const [nextId, point] = next.value;
      touchLookPrimaryId = nextId;
      touchLookLastX = point.x;
      touchLookLastY = point.y;
    }
  }
  syncMobileForwardFromLookTouches();
};
touchLookPad.addEventListener("pointerup", endTouchLook);
touchLookPad.addEventListener("pointercancel", endTouchLook);
touchJumpButton.addEventListener("pointerdown", () => {
  jumpQueued = true;
});

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "Space") {
    event.preventDefault();
    jumpQueued = true;
  }
  if (event.code === "KeyR") restartRun();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

restartButton.addEventListener("click", restartRun);

const syncTuningUI = () => {
  difficultyValueEl.textContent = `${Math.round(settings.difficulty)}%`;
  minSeparationValueEl.textContent = `${Math.round(settings.minSeparation)}%`;
  futureJumpsValueEl.textContent = `${Math.round(settings.futureJumps)}`;
  moveSpeedValueEl.textContent = settings.moveSpeed.toFixed(1);
  jumpSpeedValueEl.textContent = settings.jumpSpeed.toFixed(1);
  gravityValueEl.textContent = `${Math.round(settings.gravityMagnitude)}`;
  airDragValueEl.textContent = `${(settings.airRetainPerSec * 100).toFixed(1)}%`;
  thresholdValueEl.textContent = `${Math.round(settings.jumpTightness)}%`;
  updateMaxSeparationDisplay();
};

const removeBlockAtIndex = (index) => {
  const block = blocks[index];
  if (!block) return;
  scene.remove(block.mesh);
  block.mesh.material.dispose();
  blocks.splice(index, 1);
};

const recalcLastNodeFromBlocks = () => {
  let furthest = null;
  for (const block of blocks) {
    if (!furthest || block.sz > furthest.sz) {
      furthest = { sx: block.sx, sy: block.sy, sz: block.sz };
    }
  }
  if (furthest) lastNode = furthest;
};

const reconcileFutureJumpWindow = () => {
  const playerStep = Math.floor(player.position.z / BLOCK_SIZE);
  const maxAheadStep = playerStep + settings.futureJumps + 2;
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const block = blocks[i];
    if (block.startBlock) continue;
    if (block.sz > maxAheadStep) {
      removeBlockAtIndex(i);
    }
  }
  recalcLastNodeFromBlocks();
};

const applyTuningFromInputs = () => {
  const previousFutureJumps = settings.futureJumps;
  settings.difficulty = clamp(Number(difficultyInput.value || settings.difficulty), 0, 100);
  settings.minSeparation = clamp(Number(minSeparationInput.value || settings.minSeparation), 0, 95);
  settings.futureJumps = clamp(Math.round(Number(futureJumpsInput.value || settings.futureJumps)), 8, 96);
  settings.moveSpeed = clamp(Number(moveSpeedInput.value || settings.moveSpeed), 4, 20);
  settings.jumpSpeed = clamp(Number(jumpSpeedInput.value || settings.jumpSpeed), 4, 24);
  settings.gravityMagnitude = clamp(Number(gravityInput.value || settings.gravityMagnitude), 8, 60);
  settings.airRetainPerSec = clamp(Number(airDragInput.value || 97) / 100, 0.8, 0.99999);
  settings.jumpTightness = clamp(Number(thresholdInput.value || settings.jumpTightness), 0, 100);
  refreshSamplerParaboloid();
  if (blocks.length && previousFutureJumps !== settings.futureJumps) {
    reconcileFutureJumpWindow();
    ensureAhead();
  }
  syncTuningUI();
};

[difficultyInput, minSeparationInput, futureJumpsInput, moveSpeedInput, jumpSpeedInput, gravityInput, airDragInput, thresholdInput].forEach((input) => {
  input.addEventListener("input", applyTuningFromInputs);
});

if (samplerCard && samplerSizeButton) {
  samplerSizeButton.addEventListener("click", () => {
    samplerLarge = !samplerLarge;
    samplerCard.classList.toggle("parkourSamplerCardLarge", samplerLarge);
    samplerSizeButton.textContent = samplerLarge ? "Smaller" : "Larger";
    samplerSizeButton.setAttribute("aria-pressed", samplerLarge ? "true" : "false");
    resize();
  });
}

if (samplerRotateButton) {
  samplerRotateButton.addEventListener("click", () => {
    samplerSpinEnabled = !samplerSpinEnabled;
    samplerControls.autoRotate = samplerSpinEnabled;
    samplerRotateButton.textContent = samplerSpinEnabled ? "Spin On" : "Spin Off";
    samplerRotateButton.setAttribute("aria-pressed", samplerSpinEnabled ? "true" : "false");
  });
}

fullscreenButton.addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) {
      await viewportWrap.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch {
    hintEl.textContent = "Fullscreen unavailable in this browser context.";
  }
});

document.addEventListener("fullscreenchange", () => {
  fullscreenButton.textContent = document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen";
});

window.addEventListener("blur", clearTransientInput);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearTransientInput();
});

const updateMovement = (dt) => {
  const prevX = player.position.x;
  const prevZ = player.position.z;
  const forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS")) + Number(mobileForwardHeld);
  const strafe = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
  const move = new THREE.Vector2(strafe, forward);
  if (move.lengthSq() > 1) move.normalize();

  camera.getWorldDirection(moveForwardVector);
  moveForwardVector.y = 0;
  if (moveForwardVector.lengthSq() > 1e-6) {
    moveForwardVector.normalize();
  } else {
    moveForwardVector.set(0, 0, 1);
  }
  moveRightVector.copy(moveForwardVector).cross(WORLD_UP).normalize();
  moveWorld
    .copy(moveForwardVector)
    .multiplyScalar(move.y)
    .addScaledVector(moveRightVector, move.x);

  const hasInput = moveWorld.lengthSq() > 1e-6;
  if (hasInput) moveWorld.normalize();

  const sneakActive = isSneaking() && player.grounded;
  const targetSpeed = settings.moveSpeed * (sneakActive ? SNEAK_SPEED_MULTIPLIER : 1);
  const desiredX = hasInput ? moveWorld.x * targetSpeed : 0;
  const desiredZ = hasInput ? moveWorld.z * targetSpeed : 0;

  if (player.grounded) {
    const deltaX = desiredX - player.horizontalVelocity.x;
    const deltaZ = desiredZ - player.horizontalVelocity.z;
    const deltaMag = Math.hypot(deltaX, deltaZ);
    const maxDelta = (hasInput ? GROUND_ACCEL_RESPONSE : GROUND_BRAKE_RESPONSE) * dt;

    if (deltaMag > maxDelta && deltaMag > 1e-6) {
      const scale = maxDelta / deltaMag;
      player.horizontalVelocity.x += deltaX * scale;
      player.horizontalVelocity.z += deltaZ * scale;
    } else {
      player.horizontalVelocity.x = desiredX;
      player.horizontalVelocity.z = desiredZ;
    }

    if (!hasInput) {
      const friction = Math.max(0, 1 - GROUND_FRICTION * dt);
      player.horizontalVelocity.x *= friction;
      player.horizontalVelocity.z *= friction;
      if (Math.hypot(player.horizontalVelocity.x, player.horizontalVelocity.z) < 0.025) {
        player.horizontalVelocity.x = 0;
        player.horizontalVelocity.z = 0;
      }
    }
  } else {
    // Mostly preserve jump momentum, but allow slight mid-air correction.
    const retain = Math.pow(settings.airRetainPerSec, dt);
    player.horizontalVelocity.multiplyScalar(retain);

    if (hasInput) {
      const deltaX = desiredX - player.horizontalVelocity.x;
      const deltaZ = desiredZ - player.horizontalVelocity.z;
      const deltaMag = Math.hypot(deltaX, deltaZ);
      const maxDelta = AIR_STEER_ACCEL * dt;
      if (deltaMag > maxDelta && deltaMag > 1e-6) {
        const scale = maxDelta / deltaMag;
        player.horizontalVelocity.x += deltaX * scale;
        player.horizontalVelocity.z += deltaZ * scale;
      } else {
        player.horizontalVelocity.x = desiredX;
        player.horizontalVelocity.z = desiredZ;
      }
    }
  }

  player.position.x += player.horizontalVelocity.x * dt;
  player.position.z += player.horizontalVelocity.z * dt;

  if (sneakActive) {
    const feetY = player.position.y - PLAYER_HEIGHT * 0.5;
    if (!hasSupportAt(player.position.x, player.position.z, feetY, SNEAK_EDGE_MARGIN)) {
      const xOnlySupported = hasSupportAt(player.position.x, prevZ, feetY, SNEAK_EDGE_MARGIN);
      const zOnlySupported = hasSupportAt(prevX, player.position.z, feetY, SNEAK_EDGE_MARGIN);
      if (xOnlySupported) {
        player.position.z = prevZ;
      } else if (zOnlySupported) {
        player.position.x = prevX;
      } else {
        player.position.x = prevX;
        player.position.z = prevZ;
      }
      player.horizontalVelocity.x = 0;
      player.horizontalVelocity.z = 0;
    }
  }
};

const resolveGroundCollision = (prevFeetY) => {
  const feetY = player.position.y - PLAYER_HEIGHT * 0.5;
  let grounded = false;

  for (const block of blocks) {
    if (block.fading && !block.startBlock) continue;
    const dx = Math.abs(player.position.x - block.mesh.position.x);
    const dz = Math.abs(player.position.z - block.mesh.position.z);
    if (dx > block.halfW + PLAYER_RADIUS || dz > block.halfD + PLAYER_RADIUS) continue;
    if (feetY <= block.topY + 0.2 && prevFeetY >= block.topY - 0.58 && player.velocity.y <= 0) {
      player.position.y = block.topY + PLAYER_HEIGHT * 0.5;
      player.velocity.y = 0;
      grounded = true;
      player.lastSafePosition.copy(player.position);
      break;
    }
  }

  player.grounded = grounded;
};

const updateBlocks = (dt) => {
  const pz = player.position.z;
  for (const block of blocks) {
    if (block.startBlock) continue;
    const behind = pz - block.mesh.position.z;
    if (!block.fading && behind > FADE_START_DISTANCE) {
      block.fading = true;
      block.fadeElapsed = 0;
    }
    if (block.fading) {
      block.fadeElapsed += dt;
      const t = clamp(block.fadeElapsed / FADE_DURATION, 0, 1);
      block.mesh.material.opacity = 1 - t;
      if (behind > DESPAWN_DISTANCE || t >= 1) {
        block.remove = true;
      }
    }
  }

  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const block = blocks[i];
    if (!block.remove) continue;
    scene.remove(block.mesh);
    block.mesh.material.dispose();
    blocks.splice(i, 1);
  }
};

const ensureAhead = () => {
  const playerStep = Math.floor(player.position.z / BLOCK_SIZE);
  while (lastNode.sz < playerStep + settings.futureJumps) {
    generateNextBlock();
  }
};

const updateHUD = () => {
  const distance = Math.max(0, Math.floor(player.position.z / BLOCK_SIZE));
  distanceEl.textContent = String(distance);
  if (distance > player.bestDistance) {
    player.bestDistance = distance;
    bestEl.textContent = String(distance);
    localStorage.setItem("voxel_parkour_best", String(distance));
  }
};

const handleFall = () => {
  if (player.position.y > -30) return;
  player.position.copy(player.lastSafePosition);
  player.position.y += 0.5;
  player.velocity.set(0, 0, 0);
  player.horizontalVelocity.set(0, 0, 0);
  player.grounded = false;
  hintEl.textContent = "Missed jump. Respawned at last safe platform.";
};

const updateCamera = () => {
  camera.position.set(player.position.x, player.position.y + EYE_OFFSET, player.position.z);
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
};

const resize = () => {
  const width = Math.max(320, mount.clientWidth);
  const height = Math.max(340, mount.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);

  const samplerWidth = Math.max(140, samplerMount.clientWidth);
  const samplerHeight = Math.max(120, samplerMount.clientHeight);
  samplerCamera.aspect = samplerWidth / samplerHeight;
  samplerCamera.updateProjectionMatrix();
  samplerRenderer.setSize(samplerWidth, samplerHeight);
};
window.addEventListener("resize", resize);

const clock = new THREE.Clock();

const tick = () => {
  requestAnimationFrame(tick);
  const dt = Math.min(0.033, clock.getDelta());

  updateMovement(dt);

  const prevFeet = player.position.y - PLAYER_HEIGHT * 0.5;
  if (jumpQueued && player.grounded) {
    player.velocity.y = settings.jumpSpeed;
    player.grounded = false;
    hintEl.textContent = "Nice. Sparse jumps ahead, keep momentum.";
  }
  jumpQueued = false;

  player.velocity.y += gravityValue() * dt;
  player.position.y += player.velocity.y * dt;
  resolveGroundCollision(prevFeet);

  updateBlocks(dt);
  ensureAhead();
  updateHUD();
  handleFall();
  updateCamera();

  renderer.render(scene, camera);
  samplerControls.update();
  if (samplerChosenMesh) {
    samplerChosenMesh.material.emissiveIntensity = 0.8 + Math.sin(performance.now() * 0.01) * 0.25;
  }
  samplerRenderer.render(samplerScene, samplerCamera);
};

applyTuningFromInputs();
restartRun();
resize();
tick();
