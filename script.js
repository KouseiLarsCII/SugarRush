// script.js - Fixed Race Startup & Countdown Flow

let scene, camera, renderer, playerCar, trackCurve;
let aiCars = [];
let isPlaying = false;
let isPaused = false;
let minimapCtx;

const TOTAL_LAPS = 3;
let raceStartTime = 0;

let isCinematic = false;
let isVictoryCinematic = false;
let cinematicStartTime = 0;
let countdownValue = 3;
let isCountdownActive = false;
let raceStarted = false; // Added flag to properly track active gameplay

let speed = 0;
const maxSpeed = 1.2;
const accel = 0.015;
const decel = 0.008;
const turnSpeed = 0.035;
const roadWidth = 12.0;

const keys = { forward: false, backward: false, left: false, right: false, boost: false };

window.addEventListener('keydown', (e) => updateKeys(e.code, e.key, true));
window.addEventListener('keyup', (e) => updateKeys(e.code, e.key, false));

function updateKeys(code, key, state) {
  if (['ArrowUp', 'w', 'W'].includes(key)) keys.forward = state;
  if (['ArrowDown', 's', 'S'].includes(key)) keys.backward = state;
  if (['ArrowLeft', 'a', 'A'].includes(key)) keys.left = state;
  if (['ArrowRight', 'd', 'D'].includes(key)) keys.right = state;
  if (code === 'Space' || key === ' ') keys.boost = state;
}

function buildTrackSpline() {
  const waypoints = [
    new THREE.Vector3(0, 0, -350),
    new THREE.Vector3(180, 0, -350),
    new THREE.Vector3(320, 0, -200),
    new THREE.Vector3(350, 0, 0),
    new THREE.Vector3(200, 0, 120),
    new THREE.Vector3(380, 0, 280),
    new THREE.Vector3(150, 0, 420),
    new THREE.Vector3(-180, 0, 380),
    new THREE.Vector3(-380, 0, 180),
    new THREE.Vector3(-250, 0, -100),
    new THREE.Vector3(-350, 0, -280)
  ];

  trackCurve = new THREE.CatmullRomCurve3(waypoints, true, 'centripetal', 0.5);
}

function getBaseTerrainHeight(x, z) {
  const hill1 = Math.sin(x * 0.004 + z * 0.003) * 22.0;
  const hill2 = Math.cos(x * 0.002 - z * 0.004) * 16.0;
  return Math.max(0, hill1 + hill2 - 6.0);
}

function getMinDistanceToTrack(x, z) {
  if (!trackCurve) return 200;
  let minDistance = Infinity;
  const samples = 160;
  for (let i = 0; i < samples; i++) {
    const pt = trackCurve.getPointAt(i / samples);
    const dist = Math.hypot(x - pt.x, z - pt.z);
    if (dist < minDistance) minDistance = dist;
  }
  return minDistance;
}

window.getTerrainHeight = function(x, z) {
  const baseHeight = getBaseTerrainHeight(x, z);
  const dist = getMinDistanceToTrack(x, z);
  const clearZone = roadWidth + 20.0;
  const blendZone = clearZone + 36.0;

  if (dist < clearZone) {
    return 0;
  } else if (dist < blendZone) {
    const factor = (dist - clearZone) / (blendZone - clearZone);
    const smoothFactor = factor * factor * (3 - 2 * factor);
    return baseHeight * smoothFactor;
  }
  return baseHeight;
};

function init() {
  const container = document.getElementById('canvas-container');
  container.innerHTML = '';

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x70b2e8);
  scene.fog = new THREE.FogExp2(0x70b2e8, 0.001);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const sun = new THREE.DirectionalLight(0xfff5ea, 1.0);
  sun.position.set(300, 400, 200);
  sun.castShadow = true;
  scene.add(sun);

  buildTrackSpline();
  createExpandedTerrain();
  createRoadAndBarriers();
  createStartArch();

  if (typeof window.createSceneryObjects === 'function') {
    window.createSceneryObjects(scene, trackCurve, roadWidth);
  }

  createVehicles();

  const minimapCanvas = document.getElementById('minimap');
  minimapCtx = minimapCanvas.getContext('2d');

  window.addEventListener('resize', onWindowResize);
}

function createExpandedTerrain() {
  const size = 1200;
  const segments = 160;
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vz = pos.getZ(i);
    pos.setY(i, window.getTerrainHeight(vx, vz));
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x2e7d32,
    roughness: 0.9,
    flatShading: true
  });

  const terrainMesh = new THREE.Mesh(geo, mat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);
}

function createRoadAndBarriers() {
  const roadSamples = 800;
  const curvePoints = trackCurve.getSpacedPoints(roadSamples);
  const roadGeo = new THREE.BufferGeometry();

  const vertices = [];
  const uvs = [];

  for (let i = 0; i <= roadSamples; i++) {
    const pt = curvePoints[i % roadSamples];
    const tangent = trackCurve.getTangentAt((i % roadSamples) / roadSamples).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(tangent, up).normalize();

    const leftX = pt.x - side.x * roadWidth;
    const leftZ = pt.z - side.z * roadWidth;
    const rightX = pt.x + side.x * roadWidth;
    const rightZ = pt.z + side.z * roadWidth;

    vertices.push(leftX, 0.05, leftZ);
    vertices.push(rightX, 0.05, rightZ);

    uvs.push(0, (i / roadSamples) * 120);
    uvs.push(1, (i / roadSamples) * 120);
  }

  const indices = [];
  for (let i = 0; i < roadSamples; i++) {
    const r1 = i * 2;
    const r2 = (i + 1) * 2;
    indices.push(r1, r1 + 1, r2);
    indices.push(r1 + 1, r2 + 1, r2);
  }

  roadGeo.setIndex(indices);
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  roadGeo.computeVertexNormals();

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#181a1f';
  ctx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 64) {
    ctx.fillStyle = (y / 64) % 2 === 0 ? '#dc2626' : '#f8fafc';
    ctx.fillRect(0, y, 28, 64);
    ctx.fillRect(484, y, 28, 64);
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(32, 0, 8, 512);
  ctx.fillRect(472, 0, 8, 512);

  ctx.fillStyle = '#eab308';
  for (let y = 0; y < 512; y += 64) {
    ctx.fillRect(250, y, 12, 36);
  }

  const roadTex = new THREE.CanvasTexture(canvas);
  roadTex.wrapS = THREE.RepeatWrapping;
  roadTex.wrapT = THREE.RepeatWrapping;

  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.4,
    metalness: 0.1,
    side: THREE.DoubleSide
  });

  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  scene.add(roadMesh);

  const barrierGeo = new THREE.BoxGeometry(0.6, 1.2, 2.5);
  const barrierMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.4, roughness: 0.3 });

  for (let i = 0; i < roadSamples; i += 8) {
    const pt = curvePoints[i];
    const tangent = trackCurve.getTangentAt(i / roadSamples).normalize();
    const side = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

    const leftB = new THREE.Mesh(barrierGeo, barrierMat);
    leftB.position.copy(pt).add(side.clone().multiplyScalar(-roadWidth - 0.4));
    leftB.position.y = 0.6;
    leftB.lookAt(leftB.position.clone().add(tangent));
    scene.add(leftB);

    const rightB = new THREE.Mesh(barrierGeo, barrierMat);
    rightB.position.copy(pt).add(side.clone().multiplyScalar(roadWidth + 0.4));
    rightB.position.y = 0.6;
    rightB.lookAt(rightB.position.clone().add(tangent));
    scene.add(rightB);
  }
}

function createStartArch() {
  const startPt = trackCurve.getPointAt(0);
  const tangent = trackCurve.getTangentAt(0).normalize();
  const side = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

  const archGroup = new THREE.Group();

  const pillarGeo = new THREE.BoxGeometry(1.6, 12, 1.6);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });

  const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
  leftPillar.position.copy(startPt).add(side.clone().multiplyScalar(-roadWidth - 0.5));
  leftPillar.position.y = 6;

  const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
  rightPillar.position.copy(startPt).add(side.clone().multiplyScalar(roadWidth + 0.5));
  rightPillar.position.y = 6;

  const headerGeo = new THREE.BoxGeometry(roadWidth * 2.5, 2.5, 2.2);
  const headerMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.5, roughness: 0.3 });
  const header = new THREE.Mesh(headerGeo, headerMat);
  header.position.copy(startPt);
  header.position.y = 12;
  header.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), side);

  archGroup.add(leftPillar, rightPillar, header);
  scene.add(archGroup);
}

function createVehicles() {
  if (playerCar) {
    scene.remove(playerCar);
    playerCar = null;
  }

  if (aiCars && aiCars.length > 0) {
    aiCars.forEach(ai => {
      if (ai.mesh) {
        scene.remove(ai.mesh);
      }
    });
  }
  aiCars = [];

  const gridPositions = [
    { lane: -3.2, distOffset: 0.000 },
    { lane:  3.2, distOffset: -0.010 },
    { lane: -3.2, distOffset: -0.020 },
    { lane:  3.2, distOffset: -0.030 }
  ];

  let candidates = [...window.KART_CONFIGS.candidates];
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  playerCar = window.createKartMesh(window.KART_CONFIGS.player);
  setKartOnGrid(playerCar, gridPositions[0].lane, gridPositions[0].distOffset);
  scene.add(playerCar);

  for (let i = 0; i < 3; i++) {
    const candidate = candidates[i];
    const aiKart = window.createKartMesh(candidate);
    const grid = gridPositions[i + 1];
    setKartOnGrid(aiKart, grid.lane, grid.distOffset);
    scene.add(aiKart);

    aiCars.push({
      id: i + 1,
      name: candidate.name,
      mesh: aiKart,
      u: (1.0 + grid.distOffset) % 1.0,
      lastU: (1.0 + grid.distOffset) % 1.0,
      lap: 1,
      speed: 0.0004,
      offsetLane: grid.lane,
      finished: false,
      finalRank: null
    });
  }
}

function setKartOnGrid(kart, laneOffset, uOffset) {
  let u = (0.0 + uOffset) % 1.0;
  if (u < 0) u += 1.0;

  const pt = trackCurve.getPointAt(u);
  const tangent = trackCurve.getTangentAt(u).normalize();
  const side = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

  const pos = pt.clone().add(side.multiplyScalar(laneOffset));
  kart.position.set(pos.x, 0.0, pos.z);
  kart.lookAt(pos.clone().add(tangent));
}

window.startCinematicRace = function() {
    if (typeof window.switchToRaceMusic === 'function') {
        window.switchToRaceMusic();
    }

    const menuElement = document.getElementById('menu');
    if (menuElement) {
        menuElement.style.display = 'none';
    }

    isCinematic = true;
    isCountdownActive = false;
    raceStarted = false;
    cinematicStartTime = performance.now();
    isPlaying = true;
};

function handleCinematicCamera(elapsedSec) {
  const startPt = trackCurve.getPointAt(0);
  const tangent = trackCurve.getTangentAt(0).normalize();
  const side = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

  if (elapsedSec < 3.5) {
    const angle = elapsedSec * 0.35;
    camera.position.set(
      startPt.x + Math.sin(angle) * 32,
      22,
      startPt.z + Math.cos(angle) * 32
    );
    camera.lookAt(startPt.x, 2, startPt.z);
  } else if (elapsedSec < 7.0) {
    const t = (elapsedSec - 3.5) / 3.5;
    const sweepSide = side.clone().multiplyScalar((t - 0.5) * 20);
    const camPos = startPt.clone().add(tangent.clone().multiplyScalar(12)).add(sweepSide).add(new THREE.Vector3(0, 2.5, 0));
    
    camera.position.copy(camPos);
    camera.lookAt(startPt.x, 0.8, startPt.z);
  } else {
    isCinematic = false;
    if (!isCountdownActive) {
      isCountdownActive = true;
      runCountdown();
    }
  }
}

function handleVictoryCinematic(elapsedSec) {
  const angle = elapsedSec * 1.2;
  const radius = 14;
  camera.position.set(
    playerCar.position.x + Math.sin(angle) * radius,
    playerCar.position.y + 4.5,
    playerCar.position.z + Math.cos(angle) * radius
  );
  camera.lookAt(playerCar.position.x, playerCar.position.y + 1.0, playerCar.position.z);
}

function runCountdown() {
  const display = document.getElementById('countdown-display');
  display.style.display = 'block';
  countdownValue = 3;
  display.innerText = countdownValue;
  display.style.color = '#00f0ff';

  const timer = setInterval(() => {
    if (isPaused) return;
    
    countdownValue--;
    if (countdownValue > 0) {
      display.innerText = countdownValue;
    } else if (countdownValue === 0) {
      display.innerText = 'GO!';
      display.style.color = '#ff007f';
    } else {
      display.style.display = 'none';
      raceStarted = true; // Unlocks controls
      raceStartTime = performance.now();
      clearInterval(timer);
    }
  }, 1000);
}

function checkKartCollisions() {
  if (!playerCar || !aiCars) return;
  const collisionRadius = 2.2;

  aiCars.forEach(ai => {
    if (!ai.mesh) return;
    const dist = playerCar.position.distanceTo(ai.mesh.position);
    if (dist < collisionRadius) {
      const pushBack = new THREE.Vector3().subVectors(playerCar.position, ai.mesh.position);
      pushBack.y = 0;
      pushBack.normalize();
      
      playerCar.position.add(pushBack.multiplyScalar(0.3));
      speed *= -0.3;
    }
  });
}

function animate() {
  requestAnimationFrame(animate);
  if (!isPlaying || isPaused) return;

  if (isCinematic) {
    const elapsedSec = (performance.now() - cinematicStartTime) / 1000;
    handleCinematicCamera(elapsedSec);
    renderer.render(scene, camera);
    return;
  }

  // Handle camera and rendering properly during countdown before race begins
  if (!raceStarted) {
    updateChaseCamera();
    renderer.render(scene, camera);
    return;
  }

  if (typeof window.updateKartBehavior === 'function') {
    window.updateKartBehavior(aiCars, trackCurve, TOTAL_LAPS);
  }

  if (typeof window.updateRanksAndLaps === 'function') {
    window.updateRanksAndLaps(trackCurve, TOTAL_LAPS, playerCar, aiCars);
  }

  if (typeof window.playerFinished !== 'undefined' && !window.playerFinished) {
    let steeringInput = 0;
    if (keys.left) {
      playerCar.rotation.y -= turnSpeed * (Math.abs(speed) > 0.1 ? Math.sign(speed) : 1);
      steeringInput = -0.6;
    }
    if (keys.right) {
      playerCar.rotation.y += turnSpeed * (Math.abs(speed) > 0.1 ? Math.sign(speed) : 1);
      steeringInput = 0.6;
    }

    if (playerCar.userData) {
      if (playerCar.userData.frontLeftPivot && playerCar.userData.frontRightPivot) {
        playerCar.userData.frontLeftPivot.rotation.y = THREE.MathUtils.lerp(
          playerCar.userData.frontLeftPivot.rotation.y, 
          steeringInput, 
          0.2
        );
        playerCar.userData.frontRightPivot.rotation.y = THREE.MathUtils.lerp(
          playerCar.userData.frontRightPivot.rotation.y, 
          steeringInput, 
          0.2
        );
      }

      const rollDelta = speed * 2.5;
      ['frontLeftWheel', 'frontRightWheel', 'rearLeftWheel', 'rearRightWheel'].forEach(wheelKey => {
        if (playerCar.userData[wheelKey]) {
          playerCar.userData[wheelKey].rotation.x += rollDelta;
        }
      });
    }

    const topSpeed = keys.boost ? maxSpeed * 1.4 : maxSpeed;
    if (keys.forward) speed = Math.min(speed + accel, topSpeed);
    else if (keys.backward) speed = Math.max(speed - accel, -maxSpeed * 0.35);
    else speed *= (1 - decel);

    playerCar.translateZ(speed);
    playerCar.position.y = 0.0;
    
    enforceTrackBarriers();
    checkKartCollisions();
    updateChaseCamera();

    const speedMph = Math.floor(Math.abs(speed) * 110);
    document.getElementById('speed').innerText = speedMph;
    document.getElementById('speed-bar').style.width = `${Math.min(100, (speedMph / 150) * 100)}%`;
  } else if (isVictoryCinematic) {
    const elapsedSec = (performance.now() - cinematicStartTime) / 1000;
    handleVictoryCinematic(elapsedSec);
  }

  drawMinimap();
  renderer.render(scene, camera);
}

function updateChaseCamera() {
  const relativeCameraOffset = new THREE.Vector3(0, 3.8, -9.0);
  const cameraOffset = relativeCameraOffset.applyMatrix4(playerCar.matrixWorld);
  camera.position.lerp(cameraOffset, 0.15);
  camera.lookAt(playerCar.position.x, playerCar.position.y + 0.8, playerCar.position.z);
}

function enforceTrackBarriers() {
  if (!playerCar || !trackCurve || typeof trackCurve.getPointAt !== 'function') return;

  let closestU = 0;
  let minDistanceSq = Infinity;
  const samples = 160;

  for (let i = 0; i < samples; i++) {
    const u = i / samples;
    const pt = trackCurve.getPointAt(u);
    if (pt && playerCar.position) {
      const distSq = playerCar.position.distanceToSquared(pt);
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        closestU = u;
      }
    }
  }

  const centerPt = trackCurve.getPointAt(closestU);
  if (!centerPt || !playerCar.position) return;
  
  const currentDist = playerCar.position.distanceTo(centerPt);

  const maxAllowedDist = roadWidth + 0.2;
  if (currentDist > maxAllowedDist) {
    const pushDir = new THREE.Vector3().subVectors(centerPt, playerCar.position);
    pushDir.y = 0;
    pushDir.normalize();

    playerCar.position.copy(centerPt).sub(pushDir.multiplyScalar(maxAllowedDist));
    speed *= -0.2;
  }
}
function drawMinimap() {
  if (!minimapCtx) return;
  const w = 140, h = 140;
  const scale = 0.15;
  const cx = w / 2;
  const cy = h / 2;

  minimapCtx.clearRect(0, 0, w, h);

  minimapCtx.save();
  minimapCtx.translate(cx, cy);
  minimapCtx.rotate(-playerCar.rotation.y);

  minimapCtx.beginPath();
  minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  minimapCtx.lineWidth = 6;
  const points = trackCurve.getSpacedPoints(120);
  points.forEach((pt, idx) => {
    const mx = (pt.x - playerCar.position.x) * scale;
    const my = (pt.z - playerCar.position.z) * scale;
    if (idx === 0) minimapCtx.moveTo(mx, my);
    else minimapCtx.lineTo(mx, my);
  });
  minimapCtx.closePath();
  minimapCtx.stroke();

  aiCars.forEach(ai => {
    const ax = (ai.mesh.position.x - playerCar.position.x) * scale;
    const ay = (ai.mesh.position.z - playerCar.position.z) * scale;
    minimapCtx.fillStyle = '#ff007f';
    minimapCtx.beginPath();
    minimapCtx.arc(ax, ay, 4, 0, Math.PI * 2);
    minimapCtx.fill();
  });

  minimapCtx.restore();

  minimapCtx.fillStyle = '#00f0ff';
  minimapCtx.beginPath();
  minimapCtx.arc(cx, cy, 6, 0, Math.PI * 2);
  minimapCtx.fill();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.togglePauseMenu = function(forceState) {
  isPaused = forceState !== undefined ? forceState : !isPaused;

  if (isPaused) {
    if (typeof window.pauseRaceMusic === 'function') window.pauseRaceMusic();
  } else {
    if (typeof window.resumeRaceMusic === 'function') window.resumeRaceMusic();
  }

  if (typeof window.openPauseMenu === 'function') {
    window.openPauseMenu(isPaused);
  }
};

window.initGameEngine = function() {
  init();
  animate();
};

document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const mainMenuBtn = document.getElementById('main-menu-btn');

  if (startBtn) startBtn.addEventListener('click', window.startCinematicRace);
  if (restartBtn) restartBtn.addEventListener('click', window.restartGameSession);
  if (mainMenuBtn) mainMenuBtn.addEventListener('click', window.returnToMainMenu);

  init();
  animate();
});