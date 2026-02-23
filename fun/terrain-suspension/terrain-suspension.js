import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const viewport = document.getElementById('terrainViewport');
const noiseTypeEl = document.getElementById('noiseType');
const seedInput = document.getElementById('seedInput');
const ampInput = document.getElementById('ampInput');
const freqInput = document.getElementById('freqInput');
const ampValue = document.getElementById('ampValue');
const freqValue = document.getElementById('freqValue');
const regenBtn = document.getElementById('regenBtn');
const autopilotToggle = document.getElementById('autopilotToggle');
const maxSpeedInput = document.getElementById('maxSpeedInput');
const maxSpeedValue = document.getElementById('maxSpeedValue');
const resetCameraBtn = document.getElementById('resetCameraBtn');
const resetCarBtn = document.getElementById('resetCarBtn');
const hudSpeed = document.getElementById('hudSpeed');
const hudSeed = document.getElementById('hudSeed');
const hudNoise = document.getElementById('hudNoise');
const touchForwardBtn = document.getElementById('touchForwardBtn');
const touchBackBtn = document.getElementById('touchBackBtn');
const touchLeftBtn = document.getElementById('touchLeftBtn');
const touchRightBtn = document.getElementById('touchRightBtn');
const touchBrakeBtn = document.getElementById('touchBrakeBtn');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a101b');
scene.fog = new THREE.Fog(0x0a101b, 130, 310);

const camera = new THREE.PerspectiveCamera(60, viewport.clientWidth / viewport.clientHeight, 0.1, 1000);
camera.position.set(0, 16, 24);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 7;
controls.maxDistance = 80;
controls.maxPolarAngle = Math.PI * 0.49;

scene.add(new THREE.HemisphereLight(0x8bb7ff, 0x2f2218, 0.9));
const sun = new THREE.DirectionalLight(0xf9f4e2, 1.25);
sun.position.set(30, 55, 15);
sun.castShadow = false;
scene.add(sun);

const terrainConfig = {
  size: 220,
  segments: 170,
  amplitude: Number(ampInput.value),
  frequency: Number(freqInput.value),
  seed: Math.trunc(Number(seedInput.value)) || 0,
  noiseType: noiseTypeEl.value,
  maxSpeed: Number(maxSpeedInput?.value || 24),
};

let terrainMesh;
let terrainMaterial;
let terrainGeometry;
let noiseSampler;

class SeededNoise {
  constructor(seed) {
    this.seed = seed | 0;
    this.perm = new Uint8Array(512);
    this.grad2 = [
      [1, 1], [-1, 1], [1, -1], [-1, -1],
      [1, 0], [-1, 0], [0, 1], [0, -1],
    ];
    this.initPermutation();
  }

  initPermutation() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i += 1) p[i] = i;
    let state = (this.seed ^ 0x9e3779b9) >>> 0;
    const rand = () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return ((state >>> 0) & 0xffffffff) / 0x100000000;
    };
    for (let i = 255; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i += 1) this.perm[i] = p[i & 255];
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  grad(hash, x, y) {
    const g = this.grad2[hash & 7];
    return g[0] * x + g[1] * y;
  }

  perlin2(x, y) {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[xi] + yi];
    const ab = this.perm[this.perm[xi] + yi + 1];
    const ba = this.perm[this.perm[xi + 1] + yi];
    const bb = this.perm[this.perm[xi + 1] + yi + 1];

    const x1 = this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u);
    const x2 = this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u);
    return this.lerp(x1, x2, v);
  }

  value2(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = this.fade(xf);
    const v = this.fade(yf);

    const h = (ix, iy) => {
      const idx = this.perm[(this.perm[ix & 255] + (iy & 255)) & 255];
      return idx / 255;
    };

    const v00 = h(xi, yi);
    const v10 = h(xi + 1, yi);
    const v01 = h(xi, yi + 1);
    const v11 = h(xi + 1, yi + 1);

    const i1 = this.lerp(v00, v10, u);
    const i2 = this.lerp(v01, v11, u);
    return this.lerp(i1, i2, v) * 2 - 1;
  }

  simplexLike2(x, y) {
    // Lightweight simplex-like blend using skewed perlin octaves.
    const s = (x + y) * 0.3660254038;
    const xs = x + s;
    const ys = y + s;
    const a = this.perlin2(xs, ys);
    const b = this.perlin2(xs * 1.7 + 12.4, ys * 1.7 - 5.9);
    return a * 0.72 + b * 0.28;
  }

  fbm2(x, y, sampler, octaves = 4) {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    let totalAmp = 0;
    for (let i = 0; i < octaves; i += 1) {
      value += sampler.call(this, x * frequency, y * frequency) * amplitude;
      totalAmp += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return value / totalAmp;
  }
}

function createNoiseSampler() {
  const n = new SeededNoise(terrainConfig.seed);
  if (terrainConfig.noiseType === 'value') {
    return (x, z) => n.fbm2(x, z, n.value2, 4);
  }
  if (terrainConfig.noiseType === 'simplex') {
    return (x, z) => n.fbm2(x, z, n.simplexLike2, 4);
  }
  return (x, z) => n.fbm2(x, z, n.perlin2, 4);
}

function heightAt(x, z) {
  const nx = x * terrainConfig.frequency;
  const nz = z * terrainConfig.frequency;
  return noiseSampler(nx, nz) * terrainConfig.amplitude;
}

function rebuildTerrain() {
  noiseSampler = createNoiseSampler();
  if (terrainMesh) {
    terrainGeometry.dispose();
    terrainMaterial.dispose();
    scene.remove(terrainMesh);
  }

  terrainGeometry = new THREE.PlaneGeometry(terrainConfig.size, terrainConfig.size, terrainConfig.segments, terrainConfig.segments);
  terrainGeometry.rotateX(-Math.PI / 2);
  const pos = terrainGeometry.attributes.position;

  const color = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = heightAt(x, z);
    pos.setY(i, y);

    const t = THREE.MathUtils.clamp((y / terrainConfig.amplitude + 1) * 0.5, 0, 1);
    const c = new THREE.Color().setHSL(0.34 - t * 0.13, 0.52, 0.24 + t * 0.28);
    color[i * 3] = c.r;
    color[i * 3 + 1] = c.g;
    color[i * 3 + 2] = c.b;
  }
  terrainGeometry.setAttribute('color', new THREE.BufferAttribute(color, 3));
  terrainGeometry.computeVertexNormals();

  terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.04,
  });
  terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
  scene.add(terrainMesh);
}

const car = {
  position: new THREE.Vector3(0, 8, 0),
  yaw: 0,
  speed: 0,
  steer: 0,
  pitch: 0,
  roll: 0,
  verticalVelocity: 0,
  rideHeight: 2.1,
  wheelRadius: 0.65,
  wheelOffsets: [
    new THREE.Vector3(-1.4, 0, 2.1),
    new THREE.Vector3(1.4, 0, 2.1),
    new THREE.Vector3(-1.4, 0, -2.1),
    new THREE.Vector3(1.4, 0, -2.1),
  ],
};

const carGroup = new THREE.Group();
scene.add(carGroup);

const body = new THREE.Mesh(
  new THREE.BoxGeometry(3.5, 1.1, 5.6),
  new THREE.MeshStandardMaterial({ color: 0x3b7bfd, roughness: 0.35, metalness: 0.2 })
);
body.position.y = 0.9;
carGroup.add(body);

const cabin = new THREE.Mesh(
  new THREE.BoxGeometry(2.35, 0.9, 2.45),
  new THREE.MeshStandardMaterial({ color: 0xc8d8ff, roughness: 0.28, metalness: 0.12 })
);
cabin.position.set(0, 1.62, -0.2);
carGroup.add(cabin);

const wheelMeshes = car.wheelOffsets.map(() => {
  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(car.wheelRadius, car.wheelRadius, 0.55, 20),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.82, metalness: 0.05 })
  );
  wheel.rotation.z = Math.PI / 2;
  carGroup.add(wheel);
  return wheel;
});

const keys = {
  forward: false,
  back: false,
  left: false,
  right: false,
  brake: false,
};

const touchInput = {
  forward: false,
  back: false,
  left: false,
  right: false,
  brake: false,
};

function setKey(event, isDown) {
  const k = event.key.toLowerCase();
  if (k === 'w' || k === 'arrowup') keys.forward = isDown;
  if (k === 's' || k === 'arrowdown') keys.back = isDown;
  if (k === 'a' || k === 'arrowleft') keys.left = isDown;
  if (k === 'd' || k === 'arrowright') keys.right = isDown;
  if (k === ' ') keys.brake = isDown;
  if (isDown && k === 'r') resetCar();
}
window.addEventListener('keydown', (event) => setKey(event, true));
window.addEventListener('keyup', (event) => setKey(event, false));

function resetCar() {
  car.position.set(0, 8, 0);
  car.yaw = 0;
  car.speed = 0;
  car.steer = 0;
  car.pitch = 0;
  car.roll = 0;
  car.verticalVelocity = 0;
}

function resetCamera() {
  camera.position.set(car.position.x + 0, car.position.y + 16, car.position.z + 24);
  controls.target.copy(car.position);
  controls.update();
}

function updateUI() {
  ampValue.textContent = Number(terrainConfig.amplitude).toFixed(1);
  freqValue.textContent = Number(terrainConfig.frequency).toFixed(3);
  if (maxSpeedValue) maxSpeedValue.textContent = `${Math.round(terrainConfig.maxSpeed)} m/s`;
  hudSpeed.textContent = `${Math.abs(car.speed).toFixed(1)} m/s`;
  hudSeed.textContent = String(terrainConfig.seed);
  const label = terrainConfig.noiseType.charAt(0).toUpperCase() + terrainConfig.noiseType.slice(1);
  hudNoise.textContent = label;
}

function sampleWheelHeights() {
  const cosYaw = Math.cos(car.yaw);
  const sinYaw = Math.sin(car.yaw);
  return car.wheelOffsets.map((offset, i) => {
    const wx = car.position.x + offset.x * cosYaw - offset.z * sinYaw;
    const wz = car.position.z + offset.x * sinYaw + offset.z * cosYaw;
    const groundY = heightAt(wx, wz);
    return { wx, wz, groundY, offset, wheel: wheelMeshes[i] };
  });
}

function updateCar(dt, elapsed) {
  const auto = autopilotToggle.checked;
  let throttle = 0;
  let steerInput = 0;

  if (auto) {
    throttle = 0.86;
    const edgeFactor = Math.max(Math.abs(car.position.x), Math.abs(car.position.z)) / (terrainConfig.size * 0.48);
    const edgeSteer = edgeFactor > 0.72 ? -Math.sign(car.position.x * Math.cos(car.yaw) + car.position.z * Math.sin(car.yaw)) : 0;
    steerInput = Math.sin(elapsed * 0.22 + terrainConfig.seed * 0.003) * 0.55 + edgeSteer * 0.75;
  } else {
    const forwardInput = Number(keys.forward || touchInput.forward);
    const backInput = Number(keys.back || touchInput.back);
    const leftInput = Number(keys.left || touchInput.left);
    const rightInput = Number(keys.right || touchInput.right);
    throttle = forwardInput - backInput;
    steerInput = leftInput - rightInput;
  }

  const accel = throttle > 0 ? 15 : throttle < 0 ? 11 : 0;
  const drag = 2.4;
  car.speed += throttle * accel * dt;
  car.speed -= car.speed * drag * dt;
  if (keys.brake || touchInput.brake) car.speed *= 0.88;
  const reverseMax = Math.min(14, Math.max(5, terrainConfig.maxSpeed * 0.38));
  car.speed = THREE.MathUtils.clamp(car.speed, -reverseMax, terrainConfig.maxSpeed);

  const steerTarget = steerInput * THREE.MathUtils.clamp(0.7 + Math.abs(car.speed) * 0.03, 0.45, 1.35);
  car.steer = THREE.MathUtils.lerp(car.steer, steerTarget, dt * 5.5);
  car.yaw += car.steer * dt * (0.45 + Math.abs(car.speed) * 0.05) * Math.sign(car.speed || 1);

  const forward = new THREE.Vector3(Math.sin(car.yaw), 0, Math.cos(car.yaw));
  car.position.addScaledVector(forward, car.speed * dt);

  const wheels = sampleWheelHeights();
  const avgGround = wheels.reduce((sum, w) => sum + w.groundY, 0) / wheels.length;
  const targetY = avgGround + car.rideHeight;
  const spring = (targetY - car.position.y) * 20;
  const damper = -car.verticalVelocity * 6.5;
  car.verticalVelocity += (spring + damper) * dt;
  car.position.y += car.verticalVelocity * dt;

  const frontAvg = (wheels[0].groundY + wheels[1].groundY) * 0.5;
  const rearAvg = (wheels[2].groundY + wheels[3].groundY) * 0.5;
  const leftAvg = (wheels[0].groundY + wheels[2].groundY) * 0.5;
  const rightAvg = (wheels[1].groundY + wheels[3].groundY) * 0.5;

  const pitchTarget = THREE.MathUtils.clamp(Math.atan2(frontAvg - rearAvg, 4.2), -0.35, 0.35);
  const rollTarget = THREE.MathUtils.clamp(Math.atan2(leftAvg - rightAvg, 2.8), -0.35, 0.35);
  car.pitch = THREE.MathUtils.lerp(car.pitch, pitchTarget, dt * 8);
  car.roll = THREE.MathUtils.lerp(car.roll, rollTarget, dt * 8);

  carGroup.position.copy(car.position);
  carGroup.rotation.set(car.pitch, car.yaw, car.roll, 'YXZ');

  wheels.forEach((w) => {
    const localY = w.groundY - car.position.y + car.wheelRadius;
    w.wheel.position.set(w.offset.x, localY, w.offset.z);
    w.wheel.rotation.x += (car.speed * dt) / car.wheelRadius;
  });

  controls.target.lerp(car.position, 1 - Math.exp(-dt * 6));
}

regenBtn.addEventListener('click', () => {
  terrainConfig.seed = Math.trunc(Number(seedInput.value)) || 0;
  terrainConfig.amplitude = Number(ampInput.value);
  terrainConfig.frequency = Number(freqInput.value);
  terrainConfig.noiseType = noiseTypeEl.value;
  rebuildTerrain();
  resetCar();
  updateUI();
});

noiseTypeEl.addEventListener('change', () => {
  terrainConfig.noiseType = noiseTypeEl.value;
  rebuildTerrain();
  resetCar();
  updateUI();
});

ampInput.addEventListener('input', () => {
  terrainConfig.amplitude = Number(ampInput.value);
  ampValue.textContent = terrainConfig.amplitude.toFixed(1);
});

freqInput.addEventListener('input', () => {
  terrainConfig.frequency = Number(freqInput.value);
  freqValue.textContent = terrainConfig.frequency.toFixed(3);
});

if (maxSpeedInput) {
  maxSpeedInput.addEventListener('input', () => {
    terrainConfig.maxSpeed = Number(maxSpeedInput.value);
    if (maxSpeedValue) maxSpeedValue.textContent = `${Math.round(terrainConfig.maxSpeed)} m/s`;
  });
}

function bindTouchHold(button, key) {
  if (!button) return;
  const endHold = () => {
    touchInput[key] = false;
    button.classList.remove('isHeld');
  };
  button.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch') return;
    event.preventDefault();
    touchInput[key] = true;
    button.classList.add('isHeld');
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointerup', endHold);
  button.addEventListener('pointercancel', endHold);
  button.addEventListener('lostpointercapture', endHold);
}

bindTouchHold(touchForwardBtn, 'forward');
bindTouchHold(touchBackBtn, 'back');
bindTouchHold(touchLeftBtn, 'left');
bindTouchHold(touchRightBtn, 'right');
bindTouchHold(touchBrakeBtn, 'brake');

function clearTouchInput() {
  touchInput.forward = false;
  touchInput.back = false;
  touchInput.left = false;
  touchInput.right = false;
  touchInput.brake = false;
  [touchForwardBtn, touchBackBtn, touchLeftBtn, touchRightBtn, touchBrakeBtn].forEach((btn) => {
    if (btn) btn.classList.remove('isHeld');
  });
}

window.addEventListener('blur', clearTouchInput);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearTouchInput();
});

resetCameraBtn.addEventListener('click', resetCamera);
resetCarBtn.addEventListener('click', resetCar);

window.addEventListener('resize', () => {
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

rebuildTerrain();
resetCar();
resetCamera();
updateUI();

const clock = new THREE.Clock();

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  updateCar(dt, elapsed);
  controls.update();
  updateUI();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
