/**
 * game3d.js - Authentic Pixar WALL-E Open-World Wasteland Visualizer
 * 
 * Fixes & Upgrades:
 *  - Fixed startup crash (guarded select element null reference): Zero black screen!
 *  - Uneven natural desert terrain with rolling sand dunes, mounds & elevation
 *  - Completely removed all grids: 100% immersive movie world
 *  - Ultra-dense wasteland: 400+ scrap towers, BNL containers, oil drums, tire piles & antenna relays
 *  - Detailed 3D movie models for all artifacts:
 *     1. Worn leather boot with living green seedling
 *     2. 3D plasma scorch crater with glowing molten slag
 *     3. Vintage Hello Dolly cassette tape with visible reels
 *     4. Hal's 3x3 Rubik's cube on a plinth
 *     5. Laser-sliced steel girder monolith
 *     6. Axiom probe pylon with holographic pings
 *  - Camera points and follows strictly along WALL-E's movement direction
 */

// ==========================================
// 1. TERRAIN ELEVATION MATHEMATICS
// ==========================================

function getTerrainHeight(x, z) {
  // Primary sweeping barchan dunes
  const d1 = Math.sin(x * 0.024 + 0.6) * Math.cos(z * 0.022 + 0.4) * 4.8;
  // Cross-cresting dune ridges and curving saddles
  const d2 = Math.sin(x * 0.048 - z * 0.040) * 2.8;
  // Bouncy undulating sand mounds
  const d3 = Math.cos(x * 0.082 + z * 0.065) * 1.5;
  // Fine desert wind ripples
  const ripple = Math.sin(x * 0.18 + z * 0.14) * 0.35;
  return d1 + d2 + d3 + ripple;
}

function getTerrainNormal(x, z, step = 0.5) {
  const hL = getTerrainHeight(x - step, z);
  const hR = getTerrainHeight(x + step, z);
  const hD = getTerrainHeight(x, z - step);
  const hU = getTerrainHeight(x, z + step);
  const norm = new THREE.Vector3((hL - hR) / (2 * step), 1.0, (hD - hU) / (2 * step)).normalize();
  return norm;
}

// ==========================================
// 2. PROCEDURAL HD TEXTURE ENGINE
// ==========================================

function createGroundTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Multi-tone desert earth
  ctx.fillStyle = '#9b6d3d';
  ctx.fillRect(0, 0, 1024, 1024);

  // Sand dune wind ripple strata
  for (let y = 0; y < 1024; y += 8) {
    ctx.fillStyle = (y % 16 === 0) ? '#865b2e' : '#a97945';
    ctx.fillRect(0, y, 1024, 4);
  }

  // Heavy sand & stone grit
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 52;
    data[i] = Math.max(0, Math.min(255, data[i] + grain));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain * 0.78));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain * 0.5));
  }
  ctx.putImageData(imgData, 0, 0);

  // Parched cracked desert fissures
  ctx.strokeStyle = '#42240c';
  ctx.lineWidth = 2.0;
  for (let i = 0; i < 70; i++) {
    ctx.beginPath();
    let x = Math.random() * 1024;
    let y = Math.random() * 1024;
    ctx.moveTo(x, y);
    for (let j = 0; j < 8; j++) {
      x += (Math.random() - 0.5) * 90;
      y += (Math.random() - 0.5) * 90;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(32, 32);
  texture.needsUpdate = true;
  return texture;
}

function createChassisTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#eab308';
  ctx.fillRect(0, 0, 512, 512);

  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const wear = (Math.random() - 0.5) * 60;
    data[i] = Math.max(0, Math.min(255, data[i] + wear * 0.5));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + wear * 0.4));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + wear * 0.2));
  }
  ctx.putImageData(imgData, 0, 0);

  // Compactor Hatch Door Frame
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 6;
  ctx.strokeRect(30, 50, 452, 400);

  ctx.beginPath();
  ctx.moveTo(256, 50);
  ctx.lineTo(256, 450);
  ctx.stroke();

  // Cassette Deck on Chest
  ctx.fillStyle = '#334155';
  ctx.fillRect(80, 240, 352, 110);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.strokeRect(90, 250, 332, 90);
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(170, 295, 20, 0, Math.PI * 2);
  ctx.arc(340, 295, 20, 0, Math.PI * 2);
  ctx.fill();

  // Hazard Stripes
  const stripeWidth = 22;
  ctx.save();
  ctx.beginPath();
  ctx.rect(30, 400, 452, 50);
  ctx.clip();
  ctx.fillStyle = '#171717';
  for (let x = -50; x < 600; x += stripeWidth * 2) {
    ctx.beginPath();
    ctx.moveTo(x, 400);
    ctx.lineTo(x + 35, 450);
    ctx.lineTo(x + 35 + stripeWidth, 450);
    ctx.lineTo(x + stripeWidth, 400);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // WALL-E Logo
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(150, 160, 212, 60);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 34px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('WALL', 220, 202);
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(268, 194, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('E', 312, 202);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createScrapTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Warm lighter weathered oxide base (lighter brown tone)
  ctx.fillStyle = '#6b4830';
  ctx.fillRect(0, 0, 512, 512);

  // Irregular lighter crumpled metal sheets, corrugated plates & scrap panels
  const palette = ['#8d6343', '#7a5235', '#9e7350', '#634229', '#a67d58', '#855b3d', '#b58b64'];
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
    ctx.beginPath();
    const x0 = Math.random() * 512;
    const y0 = Math.random() * 512;
    ctx.moveTo(x0, y0);
    const pts = 3 + Math.floor(Math.random() * 4);
    for (let p = 0; p < pts; p++) {
      ctx.lineTo(x0 + (Math.random() - 0.5) * 110, y0 + (Math.random() - 0.5) * 90);
    }
    ctx.closePath();
    ctx.fill();

    // Subtle plate boundary crease
    ctx.strokeStyle = 'rgba(55, 35, 20, 0.5)';
    ctx.lineWidth = 1.5 + Math.random() * 1.5;
    ctx.stroke();
  }

  // Corrugated pressed metal ridges & steel strips
  for (let i = 0; i < 18; i++) {
    const rx = Math.random() * 460;
    const ry = Math.random() * 460;
    const angle = (Math.random() - 0.5) * Math.PI;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(angle);
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(-30, -15, 60, 30);
    for (let s = -25; s < 25; s += 8) {
      ctx.fillStyle = (s % 16 === 0) ? '#9e7350' : '#734d31';
      ctx.fillRect(s, -15, 5, 30);
    }
    ctx.restore();
  }

  // Warm rust and oxidation speckling
  ctx.fillStyle = '#c25e1a';
  for (let i = 0; i < 60; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    ctx.beginPath();
    ctx.arc(rx, ry, 2 + Math.random() * 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scorched slag and welding marks
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.35)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 512, Math.random() * 512);
    ctx.lineTo(Math.random() * 512, Math.random() * 512);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.needsUpdate = true;
  return texture;
}

function createContainerTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Rust-orange Buy n Large cargo container
  ctx.fillStyle = '#c2410c';
  ctx.fillRect(0, 0, 512, 256);

  // Vertical corrugated ribs
  const ribW = 16;
  for (let x = 0; x < 512; x += ribW) {
    ctx.fillStyle = (Math.floor(x / ribW) % 2 === 0) ? '#9a3412' : '#ea580c';
    ctx.fillRect(x, 0, ribW, 256);
  }

  // Container border framing
  ctx.strokeStyle = '#431407';
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 0, 512, 256);

  // Buy n Large Logo Stencil
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(140, 85, 232, 86);
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 3;
  ctx.strokeRect(144, 89, 224, 78);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BnL CARGO', 256, 142);

  // Hazard warning stripe at bottom
  ctx.fillStyle = '#facc15';
  ctx.fillRect(10, 220, 492, 26);
  ctx.fillStyle = '#0f172a';
  for (let hx = 10; hx < 500; hx += 30) {
    ctx.beginPath();
    ctx.moveTo(hx, 246);
    ctx.lineTo(hx + 15, 246);
    ctx.lineTo(hx + 25, 220);
    ctx.lineTo(hx + 10, 220);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createSolarHexTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 10;

  function drawHex(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const hx = x + r * Math.cos(a);
      const hy = y + r * Math.sin(a);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
  }

  const r = 40;
  const dx = r * 1.732;
  const dy = r * 1.5;
  for (let y = -20; y < 550; y += dy) {
    const offsetX = ((Math.floor(y / dy) % 2) === 0) ? 0 : dx / 2;
    for (let x = -20; x < 550; x += dx) {
      drawHex(x + offsetX, y, r * 0.9);
    }
  }

  const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 220);
  grad.addColorStop(0, 'rgba(251, 191, 36, 0.9)');
  grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(256, 256, 220, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

// ==========================================
// 3. MAIN OPEN-WORLD 3D GAME ENGINE
// ==========================================

class WallE3DGame {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.currentMissionKey = 'standard';
    this.missionData = null;
    this.currentFrameIdx = 0;
    this.isPlaying = true; // Auto-play movie experience out of the box!
    this.playbackSpeed = 1.0;
    this.cameraMode = 'chase'; // 'chase', 'orbit', 'top'

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    // Textures
    this.groundTex = null;
    this.chassisTex = null;
    this.scrapTex = null;
    this.containerTex = null;
    this.solarHexTex = null;

    // 3D Entities
    this.wallE = null;
    this.chassisMesh = null;
    this.neckMesh = null;
    this.wallEEyes = null;
    this.leftEyePod = null;
    this.rightEyePod = null;
    this.leftArmGroup = null;
    this.rightArmGroup = null;
    this.wallESolarPanels = [];
    this.scannerBeam = null;
    this.laserBeamMesh = null;
    this.eveMesh = null;
    this.halCockroach = null;
    this.compactedCubes = [];

    // Scene Collections
    this.scrapMeshes = [];
    this.solarSpotMeshes = [];
    this.clueMeshes = [];
    this.trailLine = null;
    this.trailPoints = [];

    // Feature Toggles
    this.isLaserFiring = false;
    this.isBoxMode = false;
    this.isMusicPlaying = false;
    this.bannerHideTime = 0;
    this.collectedRelicIds = new Set();
    this.collectParticles = [];

    // Smooth Movement Engine
    this.currentPos = new THREE.Vector3();
    this.targetPos = new THREE.Vector3();
    this.robotPos = new THREE.Vector3();
    this.currentHeading = 0.0;
    this.targetHeading = 0.0;
    this.frameProgress = 1.0;
    this.frameDuration = 0.65;
    this.lastTimestamp = performance.now();

    this.initTextures();
    this.initThree();
    this.loadMission(this.currentMissionKey);
    this.setupUIListeners();
    this.animate();
  }

  initTextures() {
    this.groundTex = createGroundTexture();
    this.chassisTex = createChassisTexture();
    this.scrapTex = createScrapTexture();
    this.containerTex = createContainerTexture();
    this.solarHexTex = createSolarHexTexture();
  }

  initThree() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Scene & Warm Desert Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x271c14);
    this.scene.fog = new THREE.FogExp2(0x2d2016, 0.005);

    // 2. Camera: Initialized with valid perspective
    this.camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 2000);
    this.camera.position.set(-60, 6, -65);

    // 3. Ultra-Performant Renderer with ACES Filmic Tone Mapping
    this.renderer = new THREE.WebGLRenderer({
      antialias: false, // Disabling MSAA in favor of high-performance native compositor
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap; // Much faster than PCFSoft
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);

    // 4. Orbit Controls (Used only in Orbit Mode)
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.controls.enabled = false; // Start in Chase Mode!

    // 5. Lighting: Warm Sun + Ambient Skylight
    const hemiLight = new THREE.HemisphereLight(0xffedd5, 0x5a3418, 0.95);
    this.scene.add(hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 1.5);
    this.sunLight.position.set(60, 100, -50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10.0;
    this.sunLight.shadow.camera.far = 240;
    const d = 40;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    // 6. Curvy & Bouncy Desert Dunes Terrain (600x600 with HD Height Displacements)
    const groundGeo = new THREE.PlaneGeometry(600, 600, 80, 80);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      // Map 2D plane XY to 3D terrain XZ elevation
      pos.setZ(i, getTerrainHeight(vx, -vy));
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      map: this.groundTex,
      roughness: 0.88,
      metalness: 0.06
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // NO GRIDS! All grids removed per request!

    // Resize handler
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  loadMission(key) {
    this.currentMissionKey = key;
    if (window.BUNDLED_MISSIONS && window.BUNDLED_MISSIONS[key]) {
      this.missionData = window.BUNDLED_MISSIONS[key];
    } else {
      console.error(`Mission data for '${key}' not found.`);
      return;
    }

    this.currentFrameIdx = 0;
    this.frameProgress = 1.0;
    this.trailPoints = [];

    const env = this.missionData.environment;
    const f0 = this.missionData.frames[0];
    const scale = 2.0;
    const startX = (f0.position.x - env.width / 2) * scale;
    const startZ = (f0.position.y - env.height / 2) * scale;
    const startY = getTerrainHeight(startX, startZ);

    this.currentPos.set(startX, startY, startZ);
    this.targetPos.set(startX, startY, startZ);
    this.robotPos.set(startX, startY, startZ);
    this.currentHeading = 0.0;
    this.targetHeading = 0.0;

    // Initialize camera directly behind WALL-E at spawn so zero black frames occur!
    this.camera.position.set(startX - 8.0, startY + 4.5, startZ - 8.0);
    this.camera.lookAt(startX, startY + 1.3, startZ);

    this.build3DWorld();
    this.updateHUD();
    this.updateMiniMap();
  }

  build3DWorld() {
    if (this.instancedScrapTowers) {
      this.scene.remove(this.instancedScrapTowers);
      this.instancedScrapTowers.geometry.dispose();
      this.instancedScrapTowers = null;
    }
    if (this.instancedScrapGirders) {
      this.scene.remove(this.instancedScrapGirders);
      this.instancedScrapGirders.geometry.dispose();
      this.instancedScrapGirders = null;
    }
    if (this.instancedScrapGroups) {
      this.instancedScrapGroups.forEach(mesh => {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
      });
      this.instancedScrapGroups = null;
    }
    if (this.instancedScrap) {
      this.scene.remove(this.instancedScrap);
      this.instancedScrap.geometry.dispose();
      this.instancedScrap = null;
    }
    this.scrapMeshes.forEach(m => this.scene.remove(m));
    if (this.solarSpotLights) {
      this.solarSpotLights.forEach(pl => this.scene.remove(pl));
    }
    this.solarSpotLights = [];
    this.solarSpotMeshes.forEach(m => {
      this.scene.remove(m.group);
      if (m.pLight) this.scene.remove(m.pLight);
    });
    this.clueMeshes.forEach(m => {
      this.scene.remove(m.group);
    });
    this.compactedCubes.forEach(c => this.scene.remove(c));
    if (this.wallE) this.scene.remove(this.wallE);
    if (this.eveMesh) this.scene.remove(this.eveMesh);
    if (this.trailLine) this.scene.remove(this.trailLine);

    this.scrapMeshes = [];
    this.solarSpotMeshes = [];
    this.clueMeshes = [];
    this.compactedCubes = [];

    const env = this.missionData.environment;
    const scale = 2.0;
    const offsetX = env.width / 2;
    const offsetY = env.height / 2;

    const scrapGeo = new THREE.BoxGeometry(1.9, 1.9, 1.9);
    const scrapMat = new THREE.MeshStandardMaterial({
      map: this.scrapTex,
      roughness: 0.82,
      metalness: 0.45
    });

    // 1. High-Performance Scrap Towers Built from Stacked Scrap Boxes (Lighter Warm Brown, Imposing Scale)
    const boxGeo = new THREE.BoxGeometry(3.2, 1.45, 3.2); // Larger, more imposing scrap box blocks
    const girderGeo = new THREE.BoxGeometry(0.35, 6.0, 0.35); // Heavy structural steel girders

    const maxScrapBoxes = 1100;
    const maxTowerGirders = 300;

    this.instancedScrapTowers = new THREE.InstancedMesh(boxGeo, scrapMat, maxScrapBoxes);
    this.instancedScrapTowers.castShadow = true;
    this.instancedScrapTowers.receiveShadow = true;

    this.instancedScrapGirders = new THREE.InstancedMesh(girderGeo, scrapMat, maxTowerGirders);
    this.instancedScrapGirders.castShadow = true;
    this.instancedScrapGirders.receiveShadow = true;

    let boxIdx = 0;
    let girderIdx = 0;
    const dummy = new THREE.Object3D();

    env.obstacles.forEach(obs => {
      const bx = (obs.x - offsetX) * scale;
      const bz = (obs.y - offsetY) * scale;

      // Unique deterministic tower height per obstacle tile
      const hash = Math.abs(Math.sin(bx * 12.9898 + bz * 78.233)) * 43758.5453;
      const numBoxes = 5 + Math.floor((hash % 1) * 7); // 5 to 11 imposing boxes stacked high!

      const colBaseY = getTerrainHeight(bx, bz);

      for (let s = 0; s < numBoxes; s++) {
        if (boxIdx >= maxScrapBoxes) break;

        const boxH = s * 1.42;
        const jX = Math.sin(bx + s * 1.2) * 0.10;
        const jZ = Math.cos(bz + s * 1.2) * 0.10;
        const rotY = (Math.sin(s * 1.5 + bx) * 0.16);
        const taper = Math.max(0.70, 1.0 - (s / numBoxes) * 0.30);

        // Center upright position directly on terrain
        dummy.position.set(bx + jX, colBaseY + 0.72 + boxH, bz + jZ);
        dummy.rotation.set(0, rotY, 0); // Upright vertical alignment
        dummy.scale.set(taper, 1.0, taper);
        dummy.updateMatrix();

        this.instancedScrapTowers.setMatrixAt(boxIdx++, dummy.matrix);
      }

      // Vertical structural steel girders along the tower corner
      if (girderIdx < maxTowerGirders) {
        const totalHeight = numBoxes * 1.42;
        dummy.position.set(bx + 1.1, colBaseY + totalHeight * 0.5, bz + 1.1);
        dummy.rotation.set(0, 0.2, 0);
        dummy.scale.set(1, totalHeight / 6.0, 1);
        dummy.updateMatrix();
        this.instancedScrapGirders.setMatrixAt(girderIdx++, dummy.matrix);
      }
    });

    this.instancedScrapTowers.count = boxIdx;
    this.instancedScrapTowers.instanceMatrix.needsUpdate = true;
    this.scene.add(this.instancedScrapTowers);

    this.instancedScrapGirders.count = girderIdx;
    this.instancedScrapGirders.instanceMatrix.needsUpdate = true;
    this.scene.add(this.instancedScrapGirders);

    // Dense Wasteland Clutter: Additional Scattered Scrap Piles & BNL Containers
    // Ensures no scatter clutter is spawned anywhere near WALL-E's route!
    const pathCoordinates = (this.missionData && this.missionData.frames)
      ? this.missionData.frames.map(f => ({
          x: (f.position.x - offsetX) * scale,
          z: (f.position.y - offsetY) * scale
        }))
      : [];

    const isNearPath = (px, pz, safeRadius = 3.5) => {
      for (let i = 0; i < pathCoordinates.length; i++) {
        const dx = px - pathCoordinates[i].x;
        const dz = pz - pathCoordinates[i].z;
        if (dx * dx + dz * dz < safeRadius * safeRadius) return true;
      }
      return false;
    };

    const containerMat = new THREE.MeshStandardMaterial({
      map: this.containerTex,
      roughness: 0.65,
      metalness: 0.35
    });

    let spawnedClutter = 0;
    let attempts = 0;
    let containersSpawned = 0;
    const maxContainers = 6;

    while (spawnedClutter < 200 && attempts < 1200) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const dist = 14 + Math.random() * 115;
      const rx = Math.cos(angle) * dist;
      const rz = Math.sin(angle) * dist;

      if (isNearPath(rx, rz, 4.2)) continue;

      const ry = getTerrainHeight(rx, rz);
      spawnedClutter++;

      if (containersSpawned < maxContainers && Math.random() < 0.05) {
        containersSpawned++;
        const cont = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.2, 2.2), containerMat);
        cont.position.set(rx, ry + 1.10, rz); // Center at height/2 so base rests flush on sand
        cont.rotation.y = Math.random() * Math.PI;
        cont.castShadow = true;
        this.scene.add(cont);
        this.scrapMeshes.push(cont);
      }
    }

    // 2. High-Tech Sci-Fi Solar Recharge Stations
    env.solar_spots.forEach(spot => {
      const beaconGroup = new THREE.Group();
      const sx = (spot.x - offsetX) * scale;
      const sz = (spot.y - offsetY) * scale;
      const sy = getTerrainHeight(sx, sz);
      beaconGroup.position.set(sx, sy, sz);

      // Upright orientation (no tilted dipping into terrain)
      beaconGroup.rotation.set(0, 0, 0);

      // Base plinth sitting cleanly on terrain surface
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(2.1, 2.4, 0.45, 12),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.7 })
      );
      pad.position.y = 0.22;
      pad.receiveShadow = true;
      beaconGroup.add(pad);

      const hex = new THREE.Mesh(
        new THREE.CircleGeometry(1.85, 8),
        new THREE.MeshBasicMaterial({ map: this.solarHexTex, side: THREE.DoubleSide })
      );
      hex.rotation.x = -Math.PI / 2;
      hex.position.y = 0.46;
      beaconGroup.add(hex);

      // Light Pillar
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 2.1, 35, 24, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
          transparent: true,
          opacity: 0.28,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending
        })
      );
      beam.position.y = 17.5;
      beaconGroup.add(beam);

      // Rotating Energy Rings
      const rMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.85 });
      const r1 = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.06, 8, 32), rMat);
      r1.rotation.x = Math.PI / 2;
      r1.position.y = 1.0;
      beaconGroup.add(r1);

      const r2 = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.05, 8, 32), rMat);
      r2.rotation.x = Math.PI / 2;
      r2.position.y = 1.8;
      beaconGroup.add(r2);

      const pLight = new THREE.PointLight(0xf59e0b, 2.2, 10.0);
      pLight.position.set(sx, sy + 1.8, sz);
      this.scene.add(pLight);

      this.scene.add(beaconGroup);
      this.solarSpotMeshes.push({ group: beaconGroup, r1, r2, beam });
    });

    // 3. Proper 3D Movie Models for Evidence & Artifacts
    env.clues.forEach(clue => {
      const clueGroup = new THREE.Group();
      const cx = (clue.x - offsetX) * scale;
      const cz = (clue.y - offsetY) * scale;
      const cy = getTerrainHeight(cx, cz);
      clueGroup.position.set(cx, cy, cz);

      // Stand straight up vertically (normal to the ground plane) without dipping into sand
      clueGroup.rotation.set(0, 0, 0);

      // Model Wrapper sitting naturally on the ground surface
      const modelWrapper = new THREE.Group();
      modelWrapper.position.y = 0.02; // Flush on top of terrain surface
      clueGroup.add(modelWrapper);

      const cType = clue.type || clue.clue_type;

      if (cType === 'plant_signature') {
        // AUTHENTIC MODEL: Leather Work Boot with Living Plant Seedling
        const bootGroup = new THREE.Group();
        bootGroup.scale.set(1.5, 1.5, 1.5);

        // Boot sole
        const sole = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 1.3), new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 }));
        sole.position.set(0, 0.08, 0.15);
        bootGroup.add(sole);

        // Boot body & heel
        const leatherMat = new THREE.MeshStandardMaterial({ color: 0x542b10, roughness: 0.8 });
        const heel = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.55), leatherMat);
        heel.position.set(0, 0.35, -0.25);
        bootGroup.add(heel);

        const toe = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.35, 0.7), leatherMat);
        toe.position.set(0, 0.28, 0.4);
        bootGroup.add(toe);

        // Boot shaft
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.7, 16), leatherMat);
        shaft.position.set(0, 0.65, -0.15);
        bootGroup.add(shaft);

        // Living green seedling sprouting
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0x16a34a }));
        stem.position.set(0, 1.15, -0.15);
        bootGroup.add(stem);

        const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.2 });
        const leaf1 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), leafMat);
        leaf1.scale.set(1, 0.25, 2.0);
        leaf1.position.set(0.18, 1.45, -0.15);
        leaf1.rotation.z = 0.5;
        bootGroup.add(leaf1);

        const leaf2 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), leafMat);
        leaf2.scale.set(1, 0.25, 2.0);
        leaf2.position.set(-0.18, 1.45, -0.15);
        leaf2.rotation.z = -0.5;
        bootGroup.add(leaf2);

        modelWrapper.add(bootGroup);

      } else if (cType === 'scorch_mark') {
        // High-Detail Movie Plasma Landing Crater: Glassified Obsidian Basalt, Ion Heat Discoloration & Pulsing Magma Slag
        const craterGroup = new THREE.Group();

        // 1. Vitrified Basalt Bedrock Depression (Concave glassified crater)
        const craterBasaltMat = new THREE.MeshStandardMaterial({
          color: 0x0c0a09,
          roughness: 0.92,
          metalness: 0.35
        });
        const craterBase = new THREE.Mesh(
          new THREE.CylinderGeometry(2.6, 1.6, 0.45, 24),
          craterBasaltMat
        );
        craterBase.position.y = 0.12;
        craterBase.receiveShadow = true;
        craterGroup.add(craterBase);

        // 2. High-Temperature Scorched Rainbow Tempering Discoloration Rings
        const scorchBands = [
          { r1: 2.1, r2: 2.55, col: 0x1e1b18, op: 0.8 },  // Charred soot edge
          { r1: 1.5, r2: 2.1,  col: 0x431407, op: 0.9 },  // Deep rust-orange oxidized heat rim
          { r1: 0.9, r2: 1.5,  col: 0x1e1b4b, op: 0.85 }, // Blue-purple tempered titanium discoloration
          { r1: 0.0, r2: 0.9,  col: 0x09090b, op: 1.0 }   // Glassified black impact core
        ];
        scorchBands.forEach(b => {
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(b.r1, b.r2, 24),
            new THREE.MeshStandardMaterial({
              color: b.col,
              roughness: 0.85,
              metalness: 0.4,
              side: THREE.DoubleSide
            })
          );
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = 0.36;
          craterGroup.add(ring);
        });

        // 3. Ejected Vitrified Slag Boulders around the crater rim
        const slagBoulderMat = new THREE.MeshStandardMaterial({
          color: 0x1c1917,
          roughness: 0.88,
          metalness: 0.45
        });
        for (let b = 0; b < 10; b++) {
          const angle = (b / 10) * Math.PI * 2 + (Math.sin(b * 3) * 0.2);
          const rad = 2.0 + (b % 3) * 0.3;
          const slagB = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.22 + (b % 2) * 0.12, 0),
            slagBoulderMat
          );
          slagB.position.set(Math.cos(angle) * rad, 0.38, Math.sin(angle) * rad);
          slagB.rotation.set(Math.sin(b), Math.cos(b), b);
          craterGroup.add(slagB);
        }

        // 4. Glowing Molten Slag Core Fissures (Deep thermal residual heat)
        const magmaMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
        for (let f = 0; f < 6; f++) {
          const fa = (f / 6) * Math.PI * 2;
          const vein = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.06, 0.18),
            magmaMat
          );
          vein.position.set(Math.cos(fa) * 0.65, 0.38, Math.sin(fa) * 0.65);
          vein.rotation.y = fa + Math.PI / 2;
          craterGroup.add(vein);
        }

        // 5. Thermal Core Point Light casting warm orange under-glow
        const heatGlow = new THREE.PointLight(0xff4500, 1.8, 6.0);
        heatGlow.position.set(0, 0.6, 0);
        craterGroup.add(heatGlow);

        modelWrapper.add(craterGroup);

      } else if (cType === 'rubiks_cube') {
        // Hal's Favorite 3x3 Rubik's Cube
        const cubeGroup = new THREE.Group();
        cubeGroup.scale.set(1.4, 1.4, 1.4);
        const rubikColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0xffffff, 0xf97316];
        const sz = 0.22;
        let cIdx = 0;
        for (let x = -1; x <= 1; x++) {
          for (let y = 0; y <= 2; y++) {
            for (let z = -1; z <= 1; z++) {
              const blk = new THREE.Mesh(
                new THREE.BoxGeometry(sz, sz, sz),
                new THREE.MeshStandardMaterial({ color: rubikColors[(cIdx++) % 6], roughness: 0.4 })
              );
              blk.position.set(x * (sz + 0.02), y * (sz + 0.02) + 0.1, z * (sz + 0.02));
              cubeGroup.add(blk);
            }
          }
        }
        cubeGroup.rotation.y = 0.5;
        modelWrapper.add(cubeGroup);

      } else if (cType === 'cassette_tape') {
        // Vintage "Hello Dolly!" Tape
        const tapeGroup = new THREE.Group();
        tapeGroup.scale.set(1.6, 1.6, 1.6);
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(1.0, 0.14, 0.65),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 })
        );
        body.position.y = 0.1;
        tapeGroup.add(body);

        // Cassette label & reels
        const label = new THREE.Mesh(
          new THREE.PlaneGeometry(0.7, 0.35),
          new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide })
        );
        label.rotation.x = -Math.PI / 2;
        label.position.set(0, 0.18, 0);
        tapeGroup.add(label);

        const spoolMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const sp1 = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 12), spoolMat);
        sp1.position.set(-0.25, 0.1, 0);
        tapeGroup.add(sp1);
        const sp2 = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 12), spoolMat);
        sp2.position.set(0.25, 0.1, 0);
        tapeGroup.add(sp2);

        modelWrapper.add(tapeGroup);

      } else if (cType === 'lightbulb') {
        // Glowing Tungsten Lightbulb
        const bulbGroup = new THREE.Group();
        bulbGroup.scale.set(1.5, 1.5, 1.5);

        // Glass sphere + neck
        const glass = new THREE.Mesh(
          new THREE.SphereGeometry(0.42, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xfef08a, transparent: true, opacity: 0.75, roughness: 0.1 })
        );
        glass.position.y = 0.7;
        bulbGroup.add(glass);

        // Filament
        const fil = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 8, 16), new THREE.MeshBasicMaterial({ color: 0xffedd5 }));
        fil.position.y = 0.7;
        bulbGroup.add(fil);

        // Brass screw base
        const screw = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.18, 0.35, 12),
          new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.8 })
        );
        screw.position.y = 0.25;
        bulbGroup.add(screw);

        modelWrapper.add(bulbGroup);

      } else if (cType === 'fire_extinguisher') {
        // High-Detail Movie Prop: Vintage Red CO2 Fire Extinguisher (WALL-E's Space Jetpack Prop)
        const feGroup = new THREE.Group();
        feGroup.scale.set(1.4, 1.4, 1.4);

        const redMetalMat = new THREE.MeshStandardMaterial({
          color: 0xc81e1e,
          roughness: 0.28,
          metalness: 0.35
        });
        const darkMetalMat = new THREE.MeshStandardMaterial({
          color: 0x18181b,
          roughness: 0.45,
          metalness: 0.85
        });
        const brassMat = new THREE.MeshStandardMaterial({
          color: 0xd97706,
          metalness: 0.9,
          roughness: 0.2
        });
        const rubberMat = new THREE.MeshStandardMaterial({
          color: 0x09090b,
          roughness: 0.9
        });

        // 1. Reinforced Steel Cylindrical Pressure Tank with Rounded Hemispherical Cap & Base
        const tank = new THREE.Mesh(
          new THREE.CylinderGeometry(0.36, 0.36, 1.35, 24),
          redMetalMat
        );
        tank.position.y = 0.85;
        tank.castShadow = true;
        feGroup.add(tank);

        const bottomCap = new THREE.Mesh(
          new THREE.SphereGeometry(0.36, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
          redMetalMat
        );
        bottomCap.position.y = 0.18;
        feGroup.add(bottomCap);

        const baseRim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.39, 0.14, 24),
          darkMetalMat
        );
        baseRim.position.y = 0.07;
        feGroup.add(baseRim);

        const topDome = new THREE.Mesh(
          new THREE.SphereGeometry(0.36, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
          redMetalMat
        );
        topDome.position.y = 1.52;
        feGroup.add(topDome);

        // 2. White & Yellow Buy n Large Safety Instruction Stencil Label
        const label = new THREE.Mesh(
          new THREE.CylinderGeometry(0.365, 0.365, 0.72, 24, 1, true, -Math.PI * 0.45, Math.PI * 0.9),
          new THREE.MeshStandardMaterial({
            color: 0xfef08a,
            roughness: 0.6,
            side: THREE.DoubleSide
          })
        );
        label.position.y = 0.85;
        feGroup.add(label);

        // 3. Brass Valve Neck Assembly
        const neck = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.16, 0.22, 16),
          brassMat
        );
        neck.position.y = 1.94;
        feGroup.add(neck);

        // 4. Dual Squeeze Trigger Lever Handles (Fixed Carrying Handle + Squeeze Lever)
        const carryHandle = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.06, 0.55),
          darkMetalMat
        );
        carryHandle.position.set(0, 2.06, 0.18);
        carryHandle.rotation.x = -0.15;
        feGroup.add(carryHandle);

        const triggerLever = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.05, 0.52),
          darkMetalMat
        );
        triggerLever.position.set(0, 2.16, 0.16);
        triggerLever.rotation.x = 0.12;
        feGroup.add(triggerLever);

        // 5. Metal Pull-Ring Safety Pin
        const pinRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.09, 0.02, 8, 16),
          brassMat
        );
        pinRing.position.set(0.14, 2.08, 0.05);
        pinRing.rotation.y = Math.PI / 2;
        feGroup.add(pinRing);

        // 6. Round Brass Pressure Gauge Dial
        const gauge = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16),
          brassMat
        );
        gauge.position.set(-0.16, 2.05, 0.0);
        gauge.rotation.z = Math.PI / 2;
        feGroup.add(gauge);

        const gaugeFace = new THREE.Mesh(
          new THREE.CircleGeometry(0.07, 16),
          new THREE.MeshBasicMaterial({ color: 0x22c55e })
        );
        gaugeFace.position.set(-0.195, 2.05, 0.0);
        gaugeFace.rotation.y = -Math.PI / 2;
        feGroup.add(gaugeFace);

        // 7. Flexible Heavy Rubber CO2 Discharge Hose & Funnel Horn Nozzle
        const hoseCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 1.96, -0.12),
          new THREE.Vector3(0.24, 1.82, -0.22),
          new THREE.Vector3(0.38, 1.40, -0.18),
          new THREE.Vector3(0.35, 0.85, -0.12)
        ]);
        const hose = new THREE.Mesh(
          new THREE.TubeGeometry(hoseCurve, 16, 0.045, 8, false),
          rubberMat
        );
        feGroup.add(hose);

        // Wide flared CO2 discharge horn nozzle clipped to the tank side
        const hornNozzle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.16, 0.48, 16),
          rubberMat
        );
        hornNozzle.position.set(0.34, 0.62, -0.12);
        hornNozzle.rotation.z = -0.15;
        feGroup.add(hornNozzle);

        // Slight resting tilt on the wasteland earth
        feGroup.rotation.z = 0.22;
        feGroup.rotation.x = 0.15;
        modelWrapper.add(feGroup);

      } else if (cType === 'spork') {
        // Silver Spork
        const sporkGroup = new THREE.Group();
        sporkGroup.scale.set(1.8, 1.8, 1.8);
        const silverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });

        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.03), silverMat);
        handle.position.y = 0.4;
        sporkGroup.add(handle);

        const spoonHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), silverMat);
        spoonHead.rotation.x = Math.PI;
        spoonHead.position.set(0, 0.85, 0);
        sporkGroup.add(spoonHead);

        [-0.1, 0, 0.1].forEach(tx => {
          const tine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.15, 0.03), silverMat);
          tine.position.set(tx, 1.05, 0);
          sporkGroup.add(tine);
        });

        sporkGroup.rotation.z = 0.3;
        modelWrapper.add(sporkGroup);

      } else if (cType === 'bnl_cooler') {
        // Red BNL Igloo Cooler
        const coolerGroup = new THREE.Group();
        coolerGroup.scale.set(1.4, 1.4, 1.4);
        const cBody = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 0.7, 0.7),
          new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.4 })
        );
        cBody.position.y = 0.38;
        coolerGroup.add(cBody);

        const cLid = new THREE.Mesh(
          new THREE.BoxGeometry(1.15, 0.18, 0.75),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
        );
        cLid.position.y = 0.78;
        coolerGroup.add(cLid);

        modelWrapper.add(coolerGroup);

      } else if (cType === 'hub_cap') {
        // Chrome Vintage Hub Cap
        const hcGroup = new THREE.Group();
        hcGroup.scale.set(1.6, 1.6, 1.6);
        const disk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.65, 0.65, 0.12, 24),
          new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.95, roughness: 0.1 })
        );
        disk.position.y = 0.2;
        hcGroup.add(disk);

        const centerCap = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9 })
        );
        centerCap.position.y = 0.26;
        hcGroup.add(centerCap);

        modelWrapper.add(hcGroup);

      } else if (cType === 'diamond_ring') {
        // Velvet Box with Sparkling Diamond Ring
        const ringGroup = new THREE.Group();
        ringGroup.scale.set(1.5, 1.5, 1.5);
        const vBox = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.5, 0.6),
          new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.9 })
        );
        vBox.position.y = 0.26;
        ringGroup.add(vBox);

        const band = new THREE.Mesh(
          new THREE.TorusGeometry(0.18, 0.04, 12, 24),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.1 })
        );
        band.position.set(0, 0.58, 0);
        ringGroup.add(band);

        const gem = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.12),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        );
        gem.position.set(0, 0.78, 0);
        ringGroup.add(gem);

        modelWrapper.add(ringGroup);

      } else if (cType === 'compacted_cube') {
        // Laser-Cut Steel Girder Monolith
        const girderGroup = new THREE.Group();
        const beam = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 2.2, 0.5),
          new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85 })
        );
        beam.position.y = 1.1;
        beam.rotation.z = 0.25;
        girderGroup.add(beam);

        const slice = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.52), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        slice.position.set(0.28, 1.1, 0);
        girderGroup.add(slice);
        modelWrapper.add(girderGroup);

      } else {
        // High-Detail Axiom Subspace Transponder Beacon Relay Pod
        const pylonGroup = new THREE.Group();

        // 1. Heavy Tripod Base Plinth with Anchoring Hydraulic Spikes
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.3 });
        const axiomWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1, metalness: 0.15 });
        const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const antennaMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });

        const baseHub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 0.32, 6), baseMat);
        baseHub.position.y = 0.16;
        baseHub.receiveShadow = true;
        pylonGroup.add(baseHub);

        for (let l = 0; l < 3; l++) {
          const lAngle = (l / 3) * Math.PI * 2;
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 1.1), baseMat);
          leg.position.set(Math.cos(lAngle) * 0.75, 0.1, Math.sin(lAngle) * 0.75);
          leg.rotation.y = lAngle + Math.PI / 2;
          leg.rotation.x = 0.25;
          pylonGroup.add(leg);

          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 6), antennaMat);
          spike.position.set(Math.cos(lAngle) * 1.25, 0.05, Math.sin(lAngle) * 1.25);
          spike.rotation.x = Math.PI;
          pylonGroup.add(spike);
        }

        // 2. Tapered Aerodynamic Axiom Housing Mast with Status Display
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, 1.8, 16), axiomWhiteMat);
        mast.position.y = 1.15;
        mast.castShadow = true;
        pylonGroup.add(mast);

        // LED Status Band on the mast
        const ledBand = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.265, 0.12, 16), cyanGlowMat);
        ledBand.position.y = 1.35;
        pylonGroup.add(ledBand);

        // 3. Dual Parabolic High-Gain Dish Antennas & Subspace Emitter
        const dishMount = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), baseMat);
        dishMount.position.y = 2.15;
        pylonGroup.add(dishMount);

        const dishPrimary = new THREE.Mesh(
          new THREE.SphereGeometry(0.65, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
          axiomWhiteMat
        );
        dishPrimary.position.set(0, 2.35, 0);
        dishPrimary.rotation.x = Math.PI * 0.35;
        pylonGroup.add(dishPrimary);

        const subEmitter = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.45, 8), antennaMat);
        subEmitter.position.set(0, 2.5, 0.18);
        subEmitter.rotation.x = Math.PI * 0.35;
        pylonGroup.add(subEmitter);

        const emitterTip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), cyanGlowMat);
        emitterTip.position.set(0, 2.65, 0.32);
        pylonGroup.add(emitterTip);

        // Vertical High-Frequency Whip Antenna
        const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 1.4, 8), antennaMat);
        whip.position.set(-0.15, 2.7, -0.15);
        pylonGroup.add(whip);

        // 4. Expanding Holographic Subspace Ping Waves (Spherical & Torus radar waves)
        const pingRings = [];
        for (let r = 0; r < 3; r++) {
          const pingMesh = new THREE.Mesh(
            new THREE.TorusGeometry(0.8 + r * 0.65, 0.035, 8, 32),
            new THREE.MeshBasicMaterial({
              color: 0x38bdf8,
              transparent: true,
              opacity: 0.75 - r * 0.2
            })
          );
          pingMesh.rotation.x = Math.PI / 2;
          pingMesh.position.y = 2.65;
          pylonGroup.add(pingMesh);
          pingRings.push(pingMesh);
        }

        // Dedicated Cyan Beacon Point Light
        const beaconLight = new THREE.PointLight(0x38bdf8, 2.2, 8.0);
        beaconLight.position.set(0, 2.65, 0);
        pylonGroup.add(beaconLight);

        modelWrapper.add(pylonGroup);
        modelWrapper.userData = { pingRings, emitterTip };
      }

      this.scene.add(clueGroup);
      this.clueMeshes.push({
        group: clueGroup,
        modelWrapper,
        id: clue.id,
        x: clue.x,
        y: clue.y,
        isCollected: false
      });
    });

    // 4. Build EVE Probe
    const ex = (env.eve_target.x - offsetX) * scale;
    const ez = (env.eve_target.y - offsetY) * scale;
    this.buildEVEMesh(ex, getTerrainHeight(ex, ez) + 1.8, ez);

    // 5. Build Pixar WALL-E
    this.buildWallEFullFeatures();

    // 6. Build Hal Cockroach
    this.buildHalCockroach();

    // 7. Breadcrumb Trail
    const trailMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 3, transparent: true, opacity: 0.8 });
    const trailGeo = new THREE.BufferGeometry();
    this.trailLine = new THREE.Line(trailGeo, trailMat);
    this.scene.add(this.trailLine);
  }

  buildWallEFullFeatures() {
    this.wallE = new THREE.Group();

    // 1. CHASSIS BOX & COMPACTOR DETAILS
    const bodyMat = new THREE.MeshStandardMaterial({
      map: this.chassisTex,
      roughness: 0.62,
      metalness: 0.38
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.6 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.95 });
    const yellowPaintMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55, metalness: 0.35 });

    // Main yellow compactor body
    const bodyGeo = new THREE.BoxGeometry(1.22, 1.02, 1.18);
    this.chassisMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.chassisMesh.position.y = 0.78;
    this.chassisMesh.castShadow = true;
    this.wallE.add(this.chassisMesh);

    // Front compactor door border lip
    const doorLip = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.94, 0.06), darkMetalMat);
    doorLip.position.set(0, 0.78, 0.58);
    this.wallE.add(doorLip);

    // Dual front hydraulic ram cylinders (mounted on door edges)
    [-0.52, 0.52].forEach(hx => {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.82, 12), darkMetalMat);
      cyl.position.set(hx, 0.78, 0.60);
      this.wallE.add(cyl);

      const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 12), chromeMat);
      piston.position.set(hx, 0.82, 0.60);
      this.wallE.add(piston);
    });

    // Side arm sliding track channels (left & right sides of body)
    [-0.62, 0.62].forEach(sideX => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.9), darkMetalMat);
      rail.position.set(sideX, 0.82, 0);
      this.wallE.add(rail);
    });

    // Rear cooling radiator grille & exhaust pipes
    const grill = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.04), darkMetalMat);
    grill.position.set(0, 0.78, -0.60);
    this.wallE.add(grill);

    [-0.32, 0.32].forEach(ex => {
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.35, 12), darkMetalMat);
      exhaust.position.set(ex, 1.25, -0.45);
      this.wallE.add(exhaust);
    });

    // 2. TRIANGULAR TANK TREAD ASSEMBLIES (Authentic Caterpillar tracks)
    const treadMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.95 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.4 });
    const sprocketMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });

    [-1, 1].forEach(side => {
      const treadAssembly = new THREE.Group();
      treadAssembly.position.set(side * 0.76, 0.44, 0);

      // Triangular suspension housing frame
      const frameSide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 1.35), darkMetalMat);
      frameSide.position.set(side * 0.12, 0, 0);
      treadAssembly.add(frameSide);

      // Top apex idler wheel
      const apexWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.28, 18), wheelMat);
      apexWheel.rotation.z = Math.PI / 2;
      apexWheel.position.set(0, 0.18, 0);
      treadAssembly.add(apexWheel);

      // Front drive sprocket wheel (toothed)
      const frontSprocket = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.28, 18), sprocketMat);
      frontSprocket.rotation.z = Math.PI / 2;
      frontSprocket.position.set(0, -0.10, 0.48);
      treadAssembly.add(frontSprocket);

      // Rear tensioner wheel
      const rearWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.28, 18), sprocketMat);
      rearWheel.rotation.z = Math.PI / 2;
      rearWheel.position.set(0, -0.10, -0.48);
      treadAssembly.add(rearWheel);

      // 4 Road bogies along bottom contact ground
      [-0.28, -0.09, 0.09, 0.28].forEach(bz => {
        const bogie = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.26, 14), wheelMat);
        bogie.rotation.z = Math.PI / 2;
        bogie.position.set(0, -0.22, bz);
        treadAssembly.add(bogie);
      });

      // Realistic rubber cleated track belt
      const trackBelt = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.74, 1.42), treadMat);
      trackBelt.castShadow = true;
      trackBelt.receiveShadow = true;
      treadAssembly.add(trackBelt);

      this.wallE.add(treadAssembly);
    });

    // 3. ARTICULATED THREE-JOINT SHOVEL ARMS
    const armMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55, metalness: 0.35 });
    const clawMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 });

    [-1, 1].forEach(side => {
      const armGroup = new THREE.Group();
      armGroup.position.set(side * 0.65, 0.82, 0.05);

      // Sliding shoulder carriage block
      const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.22), darkMetalMat);
      armGroup.add(carriage);

      // Upper arm armature beam
      const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.48), armMat);
      upperArm.position.set(side * 0.08, 0, 0.24);
      armGroup.add(upperArm);

      // Elbow hydraulic hinge
      const elbow = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 12), chromeMat);
      elbow.position.set(side * 0.08, 0, 0.48);
      elbow.rotation.x = Math.PI / 2;
      armGroup.add(elbow);

      // Forearm beam
      const foreArm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.32), armMat);
      foreArm.position.set(side * 0.08, 0, 0.64);
      armGroup.add(foreArm);

      // Shovel Gripper Claw Hand with 3 Articulated Fingers
      const wrist = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.1), clawMat);
      wrist.position.set(side * 0.08, 0, 0.80);
      armGroup.add(wrist);

      // 3 Pincer scoop fingers (top, bottom, outer)
      const fingerGeo = new THREE.BoxGeometry(0.04, 0.12, 0.22);
      const f1 = new THREE.Mesh(fingerGeo, clawMat);
      f1.position.set(side * 0.12, 0.05, 0.90);
      f1.rotation.y = side * 0.15;
      armGroup.add(f1);

      const f2 = new THREE.Mesh(fingerGeo, clawMat);
      f2.position.set(side * 0.12, -0.05, 0.90);
      f2.rotation.y = side * 0.15;
      armGroup.add(f2);

      const f3 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.22), clawMat);
      f3.position.set(side * 0.04, 0, 0.91);
      armGroup.add(f3);

      if (side === -1) this.leftArmGroup = armGroup;
      else this.rightArmGroup = armGroup;
      this.wallE.add(armGroup);
    });

    // 4. RECHARGE SOLAR PANEL WINGS (Deployable during charging)
    this.wallESolarPanels = [];
    const panelGeo = new THREE.BoxGeometry(0.58, 0.04, 0.98);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.92, roughness: 0.15 });

    const leftPanel = new THREE.Mesh(panelGeo, panelMat);
    leftPanel.position.set(0.28, 1.32, 0);
    this.wallE.add(leftPanel);
    this.wallESolarPanels.push(leftPanel);

    const rightPanel = new THREE.Mesh(panelGeo, panelMat);
    rightPanel.position.set(-0.28, 1.32, 0);
    this.wallE.add(rightPanel);
    this.wallESolarPanels.push(rightPanel);

    // 5. ARTICULATED HYDRAULIC PANTOGRAPH NECK
    this.neckGroup = new THREE.Group();
    this.neckGroup.position.set(0, 1.30, -0.05);

    // Base collar ring
    const baseCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.08, 16), darkMetalMat);
    this.neckGroup.add(baseCollar);

    // Dual chrome hydraulic pistons
    [-0.07, 0.07].forEach(nx => {
      const pistonSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.35, 12), darkMetalMat);
      pistonSleeve.position.set(nx, 0.18, 0);
      this.neckGroup.add(pistonSleeve);

      const pistonRod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.38, 12), chromeMat);
      pistonRod.position.set(nx, 0.26, 0);
      this.neckGroup.add(pistonRod);
    });

    // Center linkage spine
    const neckSpine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.12), darkMetalMat);
    neckSpine.position.set(0, 0.22, -0.04);
    this.neckGroup.add(neckSpine);

    this.wallE.add(this.neckGroup);

    // 6. ICONIC PIXAR BINOCULAR VISOR / EYES
    this.wallEEyes = new THREE.Group();
    this.wallEEyes.position.set(0, 1.76, -0.05);

    // Transverse brass/bronze eye yoke mount bracket
    const yokeMat = new THREE.MeshStandardMaterial({ color: 0x78716c, metalness: 0.8, roughness: 0.3 });
    const eyeYoke = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.14), yokeMat);
    eyeYoke.position.set(0, 0, -0.12);
    this.wallEEyes.add(eyeYoke);

    const yokeBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), chromeMat);
    yokeBolt.position.set(0, 0.04, -0.12);
    this.wallEEyes.add(yokeBolt);

    const eyePodMat = new THREE.MeshStandardMaterial({ color: 0xa8a29e, metalness: 0.72, roughness: 0.32 });
    const lensGlassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.08, metalness: 0.95 });
    const lensBezelMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, metalness: 0.95, roughness: 0.15 });
    const browHoodMat = new THREE.MeshStandardMaterial({ color: 0x78716c, metalness: 0.75, roughness: 0.35 });

    [-1, 1].forEach(side => {
      const eyeUnit = new THREE.Group();
      eyeUnit.position.set(side * 0.28, 0, 0);

      // Main Binocular Pod Barrel (rounded trapezoid taper)
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.23, 0.52, 24), eyePodMat);
      pod.rotation.x = Math.PI / 2;
      pod.rotation.z = side * 0.10; // Iconic subtle slanted eye angle!
      pod.castShadow = true;
      eyeUnit.add(pod);

      // Sloping Brow Hood / Eyelid (creates the soulful expressive look!)
      const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.28, 24, 1, false, 0, Math.PI), browHoodMat);
      hood.rotation.x = Math.PI / 2;
      hood.rotation.z = side * 0.10 + Math.PI / 2;
      hood.position.set(0, 0.04, 0.12);
      eyeUnit.add(hood);

      // Chrome Lens Bezel Ring
      const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 12, 24), lensBezelMat);
      bezel.position.set(0, 0, 0.26);
      eyeUnit.add(bezel);

      // Deep Optical Lens with Specular Curvature
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 20), lensGlassMat);
      lens.scale.set(1, 1, 0.35);
      lens.position.set(0, 0, 0.24);
      eyeUnit.add(lens);

      // Black Iris & Cyan Pupil Core
      const iris = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), new THREE.MeshBasicMaterial({ color: 0x082f49 }));
      iris.position.set(0, 0, 0.28);
      eyeUnit.add(iris);

      const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
      pupil.position.set(0, 0, 0.29);
      eyeUnit.add(pupil);

      // Rear Cooling Fins & Joint on back of eyes
      const rearFin = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.18, 16), darkMetalMat);
      rearFin.rotation.x = Math.PI / 2;
      rearFin.position.set(0, 0, -0.26);
      eyeUnit.add(rearFin);

      if (side === -1) this.leftEyePod = eyeUnit;
      else this.rightEyePod = eyeUnit;
      this.wallEEyes.add(eyeUnit);
    });

    // Eye Laser Cutter - Red Optical Inspection Beam
    const laserGeo = new THREE.CylinderGeometry(0.06, 0.06, 12.0, 12);
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xff1e1e });
    this.laserBeamMesh = new THREE.Mesh(laserGeo, laserMat);
    this.laserBeamMesh.rotation.x = Math.PI / 2;
    this.laserBeamMesh.position.set(0, -0.15, 6.0);
    this.laserBeamMesh.visible = false;

    this.laserLight = new THREE.PointLight(0xff0000, 4.0, 14.0);
    this.laserLight.position.set(0, 0, 10.0);
    this.laserBeamMesh.add(this.laserLight);
    this.wallEEyes.add(this.laserBeamMesh);

    // Green Active Radar Sweep Cone
    const scanGeo = new THREE.ConeGeometry(7.0, 14.0, 32, 1, true);
    const scanMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.40,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    this.scannerBeam = new THREE.Mesh(scanGeo, scanMat);
    this.scannerBeam.rotation.x = Math.PI / 2;
    this.scannerBeam.position.set(0, -0.15, 7.0);
    this.scannerBeam.visible = false;
    this.wallEEyes.add(this.scannerBeam);

    this.wallE.add(this.wallEEyes);
    this.scene.add(this.wallE);
  }

  buildHalCockroach() {
    this.halCockroach = new THREE.Group();
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x3e1f08, roughness: 0.3 })
    );
    shell.scale.set(0.6, 0.4, 1.2);
    shell.position.y = 0.08;
    this.halCockroach.add(shell);

    [-1, 1].forEach(side => {
      const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.2, 4),
        new THREE.MeshBasicMaterial({ color: 0x1f1004 })
      );
      ant.rotation.x = 0.4;
      ant.rotation.z = side * 0.4;
      ant.position.set(side * 0.05, 0.12, 0.12);
      this.halCockroach.add(ant);
    });

    this.scene.add(this.halCockroach);
  }

  buildEVEMesh(x, y, z) {
    this.eveMesh = new THREE.Group();
    this.eveMesh.position.set(x, y, z);
    this.eveBaseY = y;

    // High-Gloss Automotive Porcelain White Material
    const glossWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.05,
      metalness: 0.08
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x05070d,
      roughness: 0.02,
      metalness: 0.95
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const plantGreenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const darkSeamMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const plasmaMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.65 });
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.4 });

    // 1. Axiom Drop-Ship Heavy Scorch Landing Pad & Vitrified Blast Ring
    const padGroup = new THREE.Group();
    padGroup.position.y = -1.65;

    // Upright orientation (perpendicular to horizontal plane, resting directly on terrain surface)
    padGroup.rotation.set(0, 0, 0);

    // Vitrified dark crater bed beneath landing gear
    const craterBed = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 3.4, 0.38, 24),
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.95, metalness: 0.2 })
    );
    craterBed.position.y = 0.05;
    craterBed.receiveShadow = true;
    padGroup.add(craterBed);

    // Scorched titanium alloy drop plinth
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.4, 0.22, 24),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.6 })
    );
    pad.receiveShadow = true;
    padGroup.add(pad);

    // Heat-tempered concentric scorch rings
    const scorchRing = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.3, 24),
      new THREE.MeshStandardMaterial({ color: 0x431407, roughness: 0.8, side: THREE.DoubleSide })
    );
    scorchRing.rotation.x = -Math.PI / 2;
    scorchRing.position.y = 0.12;
    padGroup.add(scorchRing);

    // Axiom drop-ship high-intensity cyan docking guide ring
    const padRing = new THREE.Mesh(
      new THREE.RingGeometry(1.9, 2.1, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.y = 0.13;
    padGroup.add(padRing);

    // 4 Hydraulic Stabilizer Claws anchoring the plinth to the bedrock
    for (let c = 0; c < 4; c++) {
      const cAngle = (c / 4) * Math.PI * 2;
      const claw = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.18, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.3 })
      );
      claw.position.set(Math.cos(cAngle) * 2.1, 0.05, Math.sin(cAngle) * 2.1);
      claw.rotation.y = cAngle + Math.PI / 2;
      padGroup.add(claw);
    }

    this.eveMesh.add(padGroup);

    // 2. Aerodynamic Egg Capsule Torso
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.82, 36, 36), glossWhiteMat);
    torso.scale.set(1.0, 1.45, 0.88);
    torso.position.y = 0.0;
    torso.castShadow = true;
    this.eveMesh.add(torso);

    // Chest Plant Bio-Indicator (Green seedling symbol on EVE's upper chest)
    const plantSymbolGroup = new THREE.Group();
    plantSymbolGroup.position.set(-0.25, 0.45, 0.72);
    plantSymbolGroup.rotation.y = -0.25;

    const plantCircle = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.08, 16), plantGreenMat);
    plantSymbolGroup.add(plantCircle);

    const plantStem = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.08), plantGreenMat);
    plantStem.position.y = -0.01;
    plantSymbolGroup.add(plantStem);

    const plantLeaf = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12, 0, Math.PI), plantGreenMat);
    plantLeaf.position.set(0.03, 0.03, 0);
    plantLeaf.rotation.z = -0.5;
    plantSymbolGroup.add(plantLeaf);
    this.eveMesh.add(plantSymbolGroup);

    // Torso Horizontal Seam Line
    const seam = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.012, 8, 36), darkSeamMat);
    seam.rotation.x = Math.PI / 2;
    seam.scale.set(1.0, 0.88, 1.0);
    seam.position.y = -0.08;
    this.eveMesh.add(seam);

    // 3. Floating Wing Arms (Detached on sides)
    [-1, 1].forEach(side => {
      const armGroup = new THREE.Group();
      armGroup.position.set(side * 0.94, 0.12, 0);

      const arm = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), glossWhiteMat);
      arm.scale.set(0.45, 2.2, 0.82);
      arm.rotation.z = side * 0.08;
      arm.castShadow = true;
      armGroup.add(arm);

      if (side === 1) {
        const blasterNozzle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.08, 0.14, 12),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 })
        );
        blasterNozzle.position.set(0, -0.62, 0.05);
        armGroup.add(blasterNozzle);
      }

      this.eveMesh.add(armGroup);
    });

    // 4. Magnetically Detached Levitating Head
    this.eveHeadGroup = new THREE.Group();
    this.eveHeadGroup.position.set(0, 1.62, 0); // Visibly floats in the air above torso!

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.60, 36, 32), glossWhiteMat);
    head.scale.set(1.0, 0.88, 0.92);
    head.castShadow = true;
    this.eveHeadGroup.add(head);

    // Glossy Obsidian Curved Faceplate Visor
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 24), visorMat);
    visor.scale.set(0.92, 0.72, 0.44);
    visor.position.set(0, 0.02, 0.32);
    this.eveHeadGroup.add(visor);

    // Expressive Cyan Crescent LED Eyes
    [-1, 1].forEach(side => {
      const eyePod = new THREE.Group();
      eyePod.position.set(side * 0.18, 0.04, 0.53);
      eyePod.rotation.z = side * 0.20;

      const eyeMesh = new THREE.Mesh(
        new THREE.RingGeometry(0.04, 0.11, 16, 1, 0.25, Math.PI * 0.85),
        eyeMat
      );
      eyePod.add(eyeMesh);

      const eyeCore = new THREE.Mesh(new THREE.CircleGeometry(0.055, 12), eyeMat);
      eyeCore.position.set(0, 0, 0.01);
      eyePod.add(eyeCore);

      this.eveHeadGroup.add(eyePod);
    });

    this.eveMesh.add(this.eveHeadGroup);

    // 5. Antigravity Hover Thruster & Ion Aura
    const thrusterGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.75, 0.45, 16, 1, true),
      plasmaMat
    );
    thrusterGlow.position.y = -1.25;
    this.eveMesh.add(thrusterGlow);

    const hoverRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.035, 12, 36),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 })
    );
    hoverRing.rotation.x = Math.PI / 2;
    hoverRing.position.y = -1.35;
    this.eveMesh.add(hoverRing);

    // Dedicated soft cyan antigravity point light
    this.eveIonLight = new THREE.PointLight(0x38bdf8, 2.8, 9.0);
    this.eveIonLight.position.set(0, -1.0, 0);
    this.eveMesh.add(this.eveIonLight);

    this.scene.add(this.eveMesh);
  }

  setupUIListeners() {
    // Safely check mission select if present (prevents null error)
    const select = document.getElementById('mission-select');
    if (select) {
      select.addEventListener('change', (e) => {
        this.loadMission(e.target.value);
      });
    }

    const playBtn = document.getElementById('btn-play');
    if (playBtn) {
      if (this.isPlaying) {
        playBtn.textContent = '⏸ Pause';
        playBtn.classList.add('active');
      }
      playBtn.addEventListener('click', () => {
        this.isPlaying = !this.isPlaying;
        playBtn.textContent = this.isPlaying ? '⏸ Pause' : '▶ Play';
        playBtn.classList.toggle('active', this.isPlaying);
      });
    }

    const prevBtn = document.getElementById('btn-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.isPlaying = false;
        if (playBtn) playBtn.textContent = '▶ Play';
        this.jumpToFrame(Math.max(0, this.currentFrameIdx - 1));
      });
    }

    const nextBtn = document.getElementById('btn-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.isPlaying = false;
        if (playBtn) playBtn.textContent = '▶ Play';
        this.jumpToFrame(Math.min(this.missionData.frames.length - 1, this.currentFrameIdx + 1));
      });
    }

    const slider = document.getElementById('timeline-slider');
    if (slider) {
      slider.addEventListener('input', (e) => {
        this.isPlaying = false;
        if (playBtn) playBtn.textContent = '▶ Play';
        this.jumpToFrame(parseInt(e.target.value));
      });
    }

    const speedSelect = document.getElementById('speed-select');
    if (speedSelect) {
      speedSelect.addEventListener('change', (e) => {
        this.playbackSpeed = parseFloat(e.target.value);
      });
    }

    // Camera Mode Switching
    const camChase = document.getElementById('cam-chase');
    const camOrbit = document.getElementById('cam-orbit');
    const camTop = document.getElementById('cam-top');

    if (camChase && camOrbit && camTop) {
      camChase.addEventListener('click', () => {
        this.cameraMode = 'chase';
        this.controls.enabled = false;
        camChase.classList.add('active');
        camOrbit.classList.remove('active');
        camTop.classList.remove('active');
      });

      camOrbit.addEventListener('click', () => {
        this.cameraMode = 'orbit';
        this.controls.enabled = true;
        this.controls.target.set(this.robotPos.x, this.robotPos.y + 1.2, this.robotPos.z);
        camOrbit.classList.add('active');
        camChase.classList.remove('active');
        camTop.classList.remove('active');
      });

      camTop.addEventListener('click', () => {
        this.cameraMode = 'top';
        this.controls.enabled = false;
        camTop.classList.add('active');
        camChase.classList.remove('active');
        camOrbit.classList.remove('active');
      });
    }

    // Random Procedural Wasteland Mission Switcher
    const switchRandomMission = () => {
      this.hideMissionCompleteModal();
      if (!window.BUNDLED_MISSIONS) return;
      const allKeys = Object.keys(window.BUNDLED_MISSIONS);
      // Filter keys other than current if possible
      const otherKeys = allKeys.filter(k => k !== this.currentMissionKey);
      const targetKeys = otherKeys.length > 0 ? otherKeys : allKeys;
      const nextKey = targetKeys[Math.floor(Math.random() * targetKeys.length)];
      
      const playBtn = document.getElementById('btn-play');
      if (playBtn) {
        playBtn.textContent = '⏸ Pause';
        playBtn.classList.add('active');
      }
      this.loadMission(nextKey);
      this.isPlaying = true;
    };

    const btnRandomMap = document.getElementById('btn-random-map');
    if (btnRandomMap) {
      btnRandomMap.addEventListener('click', () => {
        switchRandomMission();
      });
    }

    const btnModalRandom = document.getElementById('btn-modal-random');
    if (btnModalRandom) {
      btnModalRandom.addEventListener('click', () => {
        switchRandomMission();
      });
    }

    // Mission Complete Modal Action Handlers
    const btnModalReplay = document.getElementById('btn-modal-replay');
    if (btnModalReplay) {
      btnModalReplay.addEventListener('click', () => {
        this.hideMissionCompleteModal();
        this.jumpToFrame(0);
        this.isPlaying = true;
        const playBtn = document.getElementById('btn-play');
        if (playBtn) playBtn.textContent = '⏸ Pause';
      });
    }

    const btnModalInspect = document.getElementById('btn-modal-inspect');
    if (btnModalInspect) {
      btnModalInspect.addEventListener('click', () => {
        this.hideMissionCompleteModal();
        this.cameraMode = 'orbit';
        this.controls.enabled = true;
        this.controls.target.set(this.robotPos.x, this.robotPos.y + 1.2, this.robotPos.z);
        const camChase = document.getElementById('cam-chase');
        const camOrbit = document.getElementById('cam-orbit');
        const camTop = document.getElementById('cam-top');
        if (camOrbit) camOrbit.classList.add('active');
        if (camChase) camChase.classList.remove('active');
        if (camTop) camTop.classList.remove('active');
      });
    }
  }

  showMissionCompleteModal() {
    const modal = document.getElementById('mission-modal');
    if (!modal || !this.missionData) return;
    const f = this.missionData.frames[this.currentFrameIdx];
    const stepsEl = document.getElementById('modal-metric-steps');
    const cluesEl = document.getElementById('modal-metric-clues');
    const confEl = document.getElementById('modal-metric-conf');
    const batEl = document.getElementById('modal-metric-battery');

    if (stepsEl) stepsEl.textContent = this.missionData.frames.length - 1;
    if (cluesEl) cluesEl.textContent = `${(f.discovered_clues || []).length} / ${(this.missionData.environment.clues || []).length}`;
    if (confEl) confEl.textContent = `${f.confidence}%`;
    if (batEl) batEl.textContent = `${Math.round(f.battery)}%`;

    modal.classList.remove('hidden');
  }

  hideMissionCompleteModal() {
    const modal = document.getElementById('mission-modal');
    if (modal) modal.classList.add('hidden');
  }

  triggerCompactionCube() {
    const cubeGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const cubeMat = new THREE.MeshStandardMaterial({ map: this.scrapTex });
    const cube = new THREE.Mesh(cubeGeo, cubeMat);
    const angle = this.currentHeading;
    const cx = this.robotPos.x - Math.sin(angle) * 1.5;
    const cz = this.robotPos.z - Math.cos(angle) * 1.5;
    cube.position.set(cx, getTerrainHeight(cx, cz) + 0.35, cz);
    cube.castShadow = true;
    this.scene.add(cube);
    this.compactedCubes.push(cube);

    // Compactor hatch compress animation
    if (this.chassisMesh) {
      this.chassisMesh.scale.set(1.1, 0.9, 1.1);
      setTimeout(() => this.chassisMesh.scale.set(1, 1, 1), 300);
    }
  }

  jumpToFrame(idx) {
    this.currentFrameIdx = idx;
    this.frameProgress = 1.0;

    const env = this.missionData.environment;
    const f = this.missionData.frames[idx];
    const scale = 2.0;
    const px = (f.position.x - env.width / 2) * scale;
    const pz = (f.position.y - env.height / 2) * scale;
    const py = getTerrainHeight(px, pz);

    this.currentPos.set(px, py, pz);
    this.targetPos.set(px, py, pz);
    this.robotPos.set(px, py, pz);
    this.wallE.position.copy(this.robotPos);

    if (idx < this.missionData.frames.length - 1) {
      this.hideMissionCompleteModal();
    } else {
      this.showMissionCompleteModal();
    }

    this.updateHUD();
    this.updateMiniMap();
  }

  updateHUD() {
    if (!this.missionData) return;
    const frame = this.missionData.frames[this.currentFrameIdx];
    const totalFrames = this.missionData.frames.length;

    const slider = document.getElementById('timeline-slider');
    if (slider) {
      slider.max = totalFrames - 1;
      slider.value = this.currentFrameIdx;
    }

    const stepCounter = document.getElementById('step-counter');
    if (stepCounter) stepCounter.textContent = `Tick: ${frame.step} / ${totalFrames - 1}`;

    const batteryFill = document.getElementById('battery-fill');
    const batteryVal = document.getElementById('battery-val');
    if (batteryFill && batteryVal) {
      batteryFill.style.width = `${frame.battery}%`;
      batteryVal.textContent = `${frame.battery}%`;
      batteryFill.className = 'battery-fill';
      if (frame.battery <= 25) batteryFill.classList.add('low');
      else if (frame.battery <= 55) batteryFill.classList.add('medium');
    }

    const stateBadge = document.getElementById('state-badge');
    if (stateBadge) {
      stateBadge.textContent = frame.state.replace('_', ' ');
      stateBadge.className = 'state-badge';
      if (frame.state.includes('EXPLORING')) stateBadge.classList.add('exploring');
      else if (frame.state.includes('RECHARGING')) stateBadge.classList.add('recharging');
      else if (frame.state.includes('INVESTIGATING')) stateBadge.classList.add('investigating');
      else if (frame.state.includes('PURSUING')) stateBadge.classList.add('pursuing');
    }

    const thoughtText = document.getElementById('thought-text');
    if (thoughtText) thoughtText.textContent = frame.reasoning;

    const statPos = document.getElementById('stat-pos');
    if (statPos) statPos.textContent = `(${frame.position.x}, ${frame.position.y})`;

    const statInferred = document.getElementById('stat-inferred');
    if (statInferred) statInferred.textContent = `(${frame.inferred_target.x}, ${frame.inferred_target.y})`;

    const statConf = document.getElementById('stat-conf');
    if (statConf) statConf.textContent = `${frame.confidence}%`;

    const statAction = document.getElementById('stat-action');
    if (statAction) statAction.textContent = frame.action;

    const clueList = document.getElementById('clue-list');
    if (clueList) {
      clueList.innerHTML = '';
      if (frame.discovered_clues && frame.discovered_clues.length > 0) {
        frame.discovered_clues.forEach(c => {
          const item = document.createElement('div');
          item.className = 'clue-item';
          item.innerHTML = `<span class="clue-tag">${c.clue_type.toUpperCase()}</span>: ${c.description}`;
          clueList.appendChild(item);
        });
      } else {
        clueList.innerHTML = '<div style="font-size:12px; color:#64748b; font-style:italic;">No clues discovered yet.</div>';
      }
    }
  }

  updateMiniMap() {
    const canvas = document.getElementById('mini-map-canvas');
    if (!canvas || !this.missionData) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const env = this.missionData.environment;
    const curF = this.missionData.frames[this.currentFrameIdx];

    // High-tech radar background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Subtle tactical coordinate grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < w; gx += w / 6) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }
    for (let gy = 0; gy < h; gy += h / 6) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    const mapW = env.width;
    const mapH = env.height;
    const toPx = (x, y) => ({
      x: (x / mapW) * w,
      y: (y / mapH) * h
    });

    // 1. Obstacle Scrap Towers
    ctx.fillStyle = '#475569';
    env.obstacles.forEach(obs => {
      const pt = toPx(obs.x, obs.y);
      ctx.fillRect(pt.x - 1, pt.y - 1, (w / mapW) + 2, (h / mapH) + 2);
    });

    // 2. Solar Recharge Pods
    env.solar_spots.forEach(sp => {
      const pt = toPx(sp.x, sp.y);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 3. Evidence Clues / Artifact Locations
    if (env.clues) {
      env.clues.forEach(clue => {
        const pt = toPx(clue.x, clue.y);
        const discovered = curF.discovered_clues && curF.discovered_clues.some(c => c.id === clue.id);
        ctx.fillStyle = discovered ? '#10b981' : '#059669';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, discovered ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
        if (discovered) {
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    }

    // 4. Target EVE Probe Objective Location
    if (env.eve_target) {
      const ePt = toPx(env.eve_target.x, env.eve_target.y);
      const now = performance.now();
      const pulseR = 5 + Math.sin(now * 0.005) * 3;

      // Glowing radar pings around EVE
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ePt.x, ePt.y, pulseR + 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.arc(ePt.x, ePt.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // "EVE" label
      ctx.fillStyle = '#f472b6';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('EVE', ePt.x + 7, ePt.y + 3);
    }

    // 5. Inferred Target Estimated Center
    if (curF.inferred_target) {
      const infPt = toPx(curF.inferred_target.x, curF.inferred_target.y);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(infPt.x, infPt.y, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 6. Visited Journey Path
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let i = 0; i <= this.currentFrameIdx; i++) {
      const f = this.missionData.frames[i];
      const pt = toPx(f.position.x, f.position.y);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();

    // 7. WALL-E Position, Radar Cone & Compass Direction
    const rPt = toPx(curF.position.x, curF.position.y);

    // Active Sensor Cone
    ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.beginPath();
    ctx.moveTo(rPt.x, rPt.y);
    const heading = -this.currentHeading + Math.PI / 2;
    ctx.arc(rPt.x, rPt.y, 22, heading - 0.55, heading + 0.55);
    ctx.closePath();
    ctx.fill();

    // WALL-E Marker
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(rPt.x, rPt.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const dt = Math.min((now - this.lastTimestamp) / 1000, 0.08);
    this.lastTimestamp = now;

    if (this.missionData && this.wallE) {
      const frames = this.missionData.frames;
      const env = this.missionData.environment;
      const scale = 2.0;
      const offsetX = env.width / 2;
      const offsetY = env.height / 2;

      // 1. Advance Playback
      if (this.isPlaying) {
        // Continuous fluid simulation clock: no stopping/stuttering between consecutive movement frames!
        const stepRate = (1.0 / this.frameDuration) * this.playbackSpeed;
        this.frameProgress += dt * stepRate;

        while (this.frameProgress >= 1.0 && this.isPlaying) {
          if (this.currentFrameIdx < frames.length - 1) {
            this.currentFrameIdx++;
            this.frameProgress -= 1.0;

            const currF = frames[this.currentFrameIdx];
            const nextF = frames[Math.min(frames.length - 1, this.currentFrameIdx + 1)];

            const px0 = (currF.position.x - offsetX) * scale;
            const pz0 = (currF.position.y - offsetY) * scale;
            const px1 = (nextF.position.x - offsetX) * scale;
            const pz1 = (nextF.position.y - offsetY) * scale;

            const dx = px1 - px0;
            const dz = pz1 - pz0;
            if (Math.hypot(dx, dz) > 0.05) {
              this.targetHeading = Math.atan2(dx, dz);
            }

            this.updateHUD();
            if (this.currentFrameIdx % 2 === 0 || this.currentFrameIdx === frames.length - 1) {
              this.updateMiniMap();
            }
          } else {
            this.isPlaying = false;
            this.frameProgress = 1.0;
            const playBtn = document.getElementById('btn-play');
            if (playBtn) playBtn.textContent = '▶ Play';
            this.showMissionCompleteModal();
            break;
          }
        }
      }

      // 2. Continuous Spline Interpolation across Waypoints (zero pauses between steps!)
      const i0 = Math.max(0, this.currentFrameIdx - 1);
      const i1 = this.currentFrameIdx;
      const i2 = Math.min(frames.length - 1, this.currentFrameIdx + 1);
      const i3 = Math.min(frames.length - 1, this.currentFrameIdx + 2);

      const p0x = (frames[i0].position.x - offsetX) * scale;
      const p0z = (frames[i0].position.y - offsetY) * scale;
      const p1x = (frames[i1].position.x - offsetX) * scale;
      const p1z = (frames[i1].position.y - offsetY) * scale;
      const p2x = (frames[i2].position.x - offsetX) * scale;
      const p2z = (frames[i2].position.y - offsetY) * scale;
      const p3x = (frames[i3].position.x - offsetX) * scale;
      const p3z = (frames[i3].position.y - offsetY) * scale;

      const u = Math.max(0.0, Math.min(1.0, this.frameProgress));

      // Centripetal Catmull-Rom spline interpolation along 2D map path: continuous 1st derivative (velocity)
      const catmullRom = (p0, p1, p2, p3, t) => {
        const v0 = (p2 - p0) * 0.5;
        const v1 = (p3 - p1) * 0.5;
        const t2 = t * t;
        const t3 = t * t2;
        return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
      };

      const px = catmullRom(p0x, p1x, p2x, p3x, u);
      const pz = catmullRom(p0z, p1z, p2z, p3z, u);

      // Height matches uneven terrain elevation!
      const terrainY = getTerrainHeight(px, pz);

      // Velocity direction for continuous turning
      const eps = 0.04;
      const uNext = Math.min(1.0, u + eps);
      const pxNext = catmullRom(p0x, p1x, p2x, p3x, uNext);
      const pzNext = catmullRom(p0z, p1z, p2z, p3z, uNext);
      const velX = pxNext - px;
      const velZ = pzNext - pz;
      const isMoving = Math.hypot(velX, velZ) > 0.001;

      if (isMoving) {
        this.targetHeading = Math.atan2(velX, velZ);
      }

      // 3. Smooth Heading Slerp (Fluid orientation transitions)
      let angleDiff = this.targetHeading - this.currentHeading;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      this.currentHeading += angleDiff * Math.min(1.0, dt * 10.0);

      // 3b. Compute terrain slope pitch & roll for physical dune traversal
      const fX = Math.sin(this.currentHeading);
      const fZ = Math.cos(this.currentHeading);
      const hFront = getTerrainHeight(px + fX * 0.8, pz + fZ * 0.8);
      const hBack = getTerrainHeight(px - fX * 0.8, pz - fZ * 0.8);
      const targetPitch = Math.atan2(hFront - hBack, 1.6);

      const rX = Math.cos(this.currentHeading);
      const rZ = -Math.sin(this.currentHeading);
      const hRight = getTerrainHeight(px + rX * 0.6, pz + rZ * 0.6);
      const hLeft = getTerrainHeight(px - rX * 0.6, pz - rZ * 0.6);
      const targetRoll = Math.atan2(hRight - hLeft, 1.2);

      this.currentPitch = THREE.MathUtils.lerp(this.currentPitch || 0, targetPitch, Math.min(1.0, dt * 8.0));
      this.currentRoll = THREE.MathUtils.lerp(this.currentRoll || 0, targetRoll, Math.min(1.0, dt * 8.0));

      // Bouncy tread suspension bobbing while rolling over dune crests
      const treadBounce = isMoving ? Math.sin(now * 0.018) * 0.04 : 0;
      this.robotPos.set(px, terrainY + treadBounce, pz);
      this.wallE.position.copy(this.robotPos);

      this.wallE.rotation.order = 'YXZ';
      this.wallE.rotation.y = this.currentHeading;
      this.wallE.rotation.x = -this.currentPitch;
      this.wallE.rotation.z = this.currentRoll;

      // Centered directional sun shadow following WALL-E for maximum sharpness & efficiency
      if (this.sunLight) {
        this.sunLight.position.set(px + 40, terrainY + 70, pz - 40);
        this.sunLight.target.position.set(px, terrainY, pz);
        this.sunLight.target.updateMatrixWorld();
      }

      // 4. Hal Cockroach Companion
      if (this.halCockroach) {
        const halOffsetDist = 1.35;
        const halAngle = this.currentHeading - 0.7;
        const hx = px + Math.cos(halAngle) * halOffsetDist;
        const hz = pz + Math.sin(halAngle) * halOffsetDist;
        const hy = getTerrainHeight(hx, hz);
        this.halCockroach.position.set(hx, hy + 0.04, hz);
        this.halCockroach.rotation.y = this.currentHeading + Math.sin(now * 0.02) * 0.4;
      }

      // 5. Autonomous AI Actions (Solar wings, scan radar, eye emotion tilt, laser cutting, trash compacting)
      const currentAction = frames[this.currentFrameIdx].action;
      const isCharging = (currentAction === 'SOLAR_CHARGE');
      const isScanning = (currentAction === 'SCAN');
      const isInvestigating = (currentAction === 'INVESTIGATE');

      // Update Cinematic Action Notification Banner (Persistent & professional)
      const actionBanner = document.getElementById('action-banner');
      const bannerIcon = document.getElementById('action-banner-icon');
      const bannerTitle = document.getElementById('action-banner-title');
      const bannerDesc = document.getElementById('action-banner-desc');

      if (actionBanner && bannerIcon && bannerTitle && bannerDesc) {
        if (isCharging) {
          actionBanner.classList.remove('hidden');
          this.bannerHideTime = now + 4500;
          bannerIcon.textContent = 'PWR';
          bannerTitle.textContent = 'SOLAR ARRAY RECHARGE';
          bannerDesc.textContent = `Deploying photovoltaic solar panels (Reserve: ${frames[this.currentFrameIdx].battery}%)`;
        } else if (isInvestigating) {
          actionBanner.classList.remove('hidden');
          this.bannerHideTime = now + 5000;
          bannerIcon.textContent = 'REC';
          bannerTitle.textContent = 'ARTIFACT SPECIMEN RECOVERY';
          bannerDesc.textContent = frames[this.currentFrameIdx].reasoning || 'Analyzing physical evidence with optical laser';
        } else if (isScanning) {
          actionBanner.classList.remove('hidden');
          this.bannerHideTime = now + 4000;
          bannerIcon.textContent = 'RAD';
          bannerTitle.textContent = 'ACTIVE RADAR SWEEP';
          bannerDesc.textContent = "Triangulating Axiom probe carrier wave across wasteland";
        } else if (now > this.bannerHideTime) {
          actionBanner.classList.add('hidden');
        }
      }

      // Check for Discovered Relics & Trigger 3D Collection Animation
      const discoveredClueList = frames[this.currentFrameIdx].discovered_clues || [];
      const discoveredIds = new Set(discoveredClueList.map(c => c.id));

      this.clueMeshes.forEach(cm => {
        const hasBeenFound = discoveredIds.has(cm.id);

        if (hasBeenFound) {
          // Relic is collected! Animate it flying into WALL-E's compactor hatch
          if (!cm.isCollected) {
            cm.isCollected = true;
            cm.collectionStartTime = now;
          }

          const elapsed = (now - cm.collectionStartTime) / 1000;
          if (elapsed < 1.4) {
            // Magnetic fly into WALL-E's hatch
            const liftT = Math.min(1.0, elapsed / 1.4);
            const easeLift = liftT * liftT;
            const targetHatchX = px;
            const targetHatchY = terrainY + 0.75;
            const targetHatchZ = pz;

            cm.modelWrapper.position.x = THREE.MathUtils.lerp(0, targetHatchX - cm.group.position.x, easeLift);
            cm.modelWrapper.position.y = THREE.MathUtils.lerp(0.02, (targetHatchY - cm.group.position.y) + 0.4, easeLift);
            cm.modelWrapper.position.z = THREE.MathUtils.lerp(0, targetHatchZ - cm.group.position.z, easeLift);

            const scale = Math.max(0.01, 1.0 - easeLift * 0.9);
            cm.modelWrapper.scale.set(scale, scale, scale);
            cm.modelWrapper.rotation.y += 0.15;
          } else {
            // Relic safely stored in WALL-E's collection compartment
            cm.modelWrapper.visible = false;
          }
        }
      });

      // Solar Wings: Automatically deploy when charging under sunlight
      const targetPanelX = isCharging ? 0.95 : 0.28;
      const targetPanelY = isCharging ? 1.48 : 1.30;
      this.wallESolarPanels[0].position.x = THREE.MathUtils.lerp(this.wallESolarPanels[0].position.x, targetPanelX, 0.1);
      this.wallESolarPanels[0].position.y = THREE.MathUtils.lerp(this.wallESolarPanels[0].position.y, targetPanelY, 0.1);
      this.wallESolarPanels[1].position.x = THREE.MathUtils.lerp(this.wallESolarPanels[1].position.x, -targetPanelX, 0.1);
      this.wallESolarPanels[1].position.y = THREE.MathUtils.lerp(this.wallESolarPanels[1].position.y, targetPanelY, 0.1);

      // Autonomous Laser Cutter: Automatically fires during physical artifact INVESTIGATION
      if (isInvestigating) {
        this.laserBeamMesh.visible = (Math.sin(now * 0.03) > -0.2);
        this.wallEEyes.rotation.x = 0.35;
        if (this.laserLight) this.laserLight.intensity = 3.5 + Math.sin(now * 0.04) * 2.0;

        // Curious arm gestures reaching out to collect artifact
        if (this.leftArmGroup && this.rightArmGroup) {
          this.leftArmGroup.rotation.x = 0.55 + Math.sin(now * 0.01) * 0.2;
          this.rightArmGroup.rotation.x = 0.55 - Math.sin(now * 0.01) * 0.2;
          this.leftArmGroup.position.x = -0.45;
          this.rightArmGroup.position.x = 0.45;
        }
      } else {
        this.laserBeamMesh.visible = false;
        this.wallEEyes.rotation.x = 0.0;
        if (this.leftArmGroup && this.rightArmGroup) {
          this.leftArmGroup.rotation.x = THREE.MathUtils.lerp(this.leftArmGroup.rotation.x, 0, 0.1);
          this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(this.rightArmGroup.rotation.x, 0, 0.1);
          this.leftArmGroup.position.x = THREE.MathUtils.lerp(this.leftArmGroup.position.x, -0.64, 0.1);
          this.rightArmGroup.position.x = THREE.MathUtils.lerp(this.rightArmGroup.position.x, 0.64, 0.1);
        }
      }

      // Autonomous Compactor: Periodically compacts a waste cube during exploration
      if (this.currentFrameIdx > 0 && this.currentFrameIdx % 22 === 0 && this.frameProgress < 0.05) {
        if (!this._lastCompactedFrame || this._lastCompactedFrame !== this.currentFrameIdx) {
          this._lastCompactedFrame = this.currentFrameIdx;
          this.triggerCompactionCube();
        }
      }

      // Eye Curiosity Tilt & Radar Scanner
      if (isScanning) {
        this.wallEEyes.rotation.y = Math.sin(now * 0.012) * 0.55;
        this.leftEyePod.rotation.z = -0.22 + Math.sin(now * 0.01) * 0.15;
        this.rightEyePod.rotation.z = 0.22 - Math.sin(now * 0.01) * 0.15;
        this.scannerBeam.scale.set(1 + Math.sin(now * 0.008) * 0.2, 1, 1 + Math.sin(now * 0.008) * 0.2);
      } else if (!isInvestigating) {
        this.wallEEyes.rotation.y = THREE.MathUtils.lerp(this.wallEEyes.rotation.y, 0, 0.1);
        this.leftEyePod.rotation.z = THREE.MathUtils.lerp(this.leftEyePod.rotation.z, -0.12, 0.1);
        this.rightEyePod.rotation.z = THREE.MathUtils.lerp(this.rightEyePod.rotation.z, 0.12, 0.1);
      }
      this.scannerBeam.visible = isScanning;

      // Breadcrumb Trail
      if (this.trailPoints.length === 0 || this.trailPoints[this.trailPoints.length - 1].distanceTo(this.wallE.position) > 0.4) {
        this.trailPoints.push(new THREE.Vector3(px, terrainY + 0.06, pz));
        this.trailLine.geometry.setFromPoints(this.trailPoints);
      }

      // Animate Solar Stations
      this.solarSpotMeshes.forEach(spot => {
        spot.r1.rotation.z += 0.025;
        spot.r2.rotation.z -= 0.035;
        spot.beam.material.opacity = 0.22 + Math.sin(now * 0.003) * 0.08;
      });

      // Animate Beacon Ping Holographic Wave Relays
      this.clueMeshes.forEach(cm => {
        if (cm.modelWrapper && cm.modelWrapper.userData && cm.modelWrapper.userData.pingRings) {
          const { pingRings, emitterTip } = cm.modelWrapper.userData;
          pingRings.forEach((rMesh, rIdx) => {
            const phase = (now * 0.0025 + rIdx * 0.7) % Math.PI;
            const waveScale = 0.7 + Math.sin(phase) * 0.8;
            rMesh.scale.set(waveScale, waveScale, waveScale);
            rMesh.material.opacity = Math.max(0, 0.85 - (waveScale - 0.7) * 0.9);
            rMesh.rotation.z += 0.015;
          });
          if (emitterTip) {
            emitterTip.scale.setScalar(1.0 + Math.sin(now * 0.008) * 0.25);
          }
        }
      });

      // EVE Pixar Hover & Head Scanning Animation
      if (this.eveMesh && this.eveBaseY !== undefined) {
        this.eveMesh.position.y = this.eveBaseY + Math.sin(now * 0.0028) * 0.16;
        if (this.eveHeadGroup) {
          this.eveHeadGroup.rotation.y = Math.sin(now * 0.0014) * 0.25;
          this.eveHeadGroup.rotation.z = Math.sin(now * 0.0018) * 0.05;
        }
      }

      // ==========================================
      // 6. ROCK-SOLID CAMERA LOGIC
      // ==========================================
      if (this.cameraMode === 'chase') {
        this.controls.enabled = false;
        // Ultra-Smooth Cinematic Chase Camera: dynamically damped to avoid jerky movements
        const camDistance = 9.5;
        const camHeight = 5.0;
        const lookAheadDistance = 3.5;
        const lookHeight = 1.5;

        const heading = this.currentHeading;

        // Position smoothly behind WALL-E along his movement heading
        const idealCamX = px - Math.sin(heading) * camDistance;
        const idealCamZ = pz - Math.cos(heading) * camDistance;
        const idealCamY = terrainY + camHeight;

        // Smooth delta-time aware camera damping (prevents frame hitch jitter)
        const camFollowAlpha = 1.0 - Math.exp(-dt * 6.5);
        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, idealCamX, camFollowAlpha);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, idealCamY, camFollowAlpha);
        this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, idealCamZ, camFollowAlpha);

        // Smoothly interpolated target look point
        const targetLookX = px + Math.sin(heading) * lookAheadDistance;
        const targetLookZ = pz + Math.cos(heading) * lookAheadDistance;
        const targetLookY = terrainY + lookHeight;

        if (!this.camLookPos) {
          this.camLookPos = new THREE.Vector3(targetLookX, targetLookY, targetLookZ);
        } else {
          const lookAlpha = 1.0 - Math.exp(-dt * 9.0);
          this.camLookPos.x = THREE.MathUtils.lerp(this.camLookPos.x, targetLookX, lookAlpha);
          this.camLookPos.y = THREE.MathUtils.lerp(this.camLookPos.y, targetLookY, lookAlpha);
          this.camLookPos.z = THREE.MathUtils.lerp(this.camLookPos.z, targetLookZ, lookAlpha);
        }

        this.camera.lookAt(this.camLookPos.x, this.camLookPos.y, this.camLookPos.z);
      } else if (this.cameraMode === 'top') {
        this.controls.enabled = false;
        this.camera.position.set(px, terrainY + 110, pz + 0.1);
        this.camera.lookAt(px, terrainY, pz);
      } else {
        // Orbit Mode
        this.controls.enabled = true;
        this.controls.target.set(px, terrainY + 1.2, pz);
        this.controls.update();
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new WallE3DGame();
});
