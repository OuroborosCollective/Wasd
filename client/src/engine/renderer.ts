import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { showTooltip, hideTooltip, createWorldLabel, removeWorldLabel, showFloatingText, updateMinimap } from "../ui/hud";
import { getClosestInteractable } from "../utils/interaction";
import { initMobileControls, getJoystickState, isMobile } from "../ui/mobileControls";

const gltfLoader = new GLTFLoader();
const modelCache = new Map<string, THREE.Group>();

function loadModel(path: string, callback: (model: THREE.Group) => void) {
  if (modelCache.has(path)) { callback(modelCache.get(path)!.clone()); return; }
  gltfLoader.load(path, (gltf) => { modelCache.set(path, gltf.scene); callback(gltf.scene.clone()); }, undefined, (err) => console.warn("Model load error:", path, err));
}

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let myPlayerId: string | null = null;
let clock: THREE.Clock;
let waterMesh: THREE.Mesh | null = null;
let highlightRing: THREE.Mesh | null = null;
let highlightPulse = 0;

const playerMeshes = new Map<string, THREE.Object3D>();
const npcMeshes = new Map<string, THREE.Object3D>();
const lootMeshes = new Map<string, THREE.Object3D>();
const targetPositions = new Map<string, THREE.Vector3>();

let cameraAngleH = 0;
let cameraAngleV = 0.6;
let cameraDistance = 18;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
const cameraTarget = new THREE.Vector3(32, 0, 32);

// Mobile joystick movement callback
let onJoystickMove: ((dx: number, dy: number) => void) | null = null;

export function setJoystickMoveCallback(cb: (dx: number, dy: number) => void) {
  onJoystickMove = cb;
}

export function getTerrainHeight(x: number, z: number): number {
  let h = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 8
        + Math.sin(x * 0.05 + 1.3) * Math.cos(z * 0.05 + 0.7) * 4
        + Math.sin(x * 0.1 + 2.1) * Math.cos(z * 0.1 + 1.5) * 2
        + Math.sin(x * 0.2) * Math.cos(z * 0.2);
  const d = Math.sqrt((x - 32) * (x - 32) + (z - 32) * (z - 32));
  if (d < 80) h *= Math.max(0, (d - 20) / 60);
  return Math.max(0, h);
}

export function projectToScreen(x: number, y: number, z: number) {
  const v = new THREE.Vector3(x, y, z).project(camera);
  return { x: (v.x + 1) / 2 * window.innerWidth, y: -(v.y - 1) / 2 * window.innerHeight, inFront: v.z < 1 };
}

function buildTerrain(): THREE.Mesh {
  // Lower resolution on mobile for performance
  const segments = isMobile() ? 50 : 80;
  const geo = new THREE.PlaneGeometry(1000, 1000, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const cols: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = getTerrainHeight(x, z);
    pos.setY(i, h);
    if (h < 1) cols.push(0.2, 0.35, 0.15);
    else if (h < 4) cols.push(0.3, 0.5, 0.2);
    else if (h < 8) cols.push(0.45, 0.55, 0.35);
    else cols.push(0.55, 0.5, 0.4);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.receiveShadow = true;
  return mesh;
}

function buildScene(s: THREE.Scene) {
  // Sky gradient sphere
  const skyGeo = new THREE.SphereGeometry(800, 16, 16);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      top: { value: new THREE.Color(0.08, 0.15, 0.45) },
      bot: { value: new THREE.Color(0.5, 0.7, 0.9) }
    },
    vertexShader: `varying vec3 vP; void main(){ vP=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform vec3 top,bot; varying vec3 vP; void main(){ float h=normalize(vP).y; gl_FragColor=vec4(mix(bot,top,clamp(h,0.,1.)),1.);}`,
    side: THREE.BackSide
  });
  s.add(new THREE.Mesh(skyGeo, skyMat));

  // Lights
  s.add(new THREE.AmbientLight(0xffeedd, 0.6));
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
  sun.position.set(200, 300, 100);
  sun.castShadow = !isMobile(); // Disable shadows on mobile for performance
  if (!isMobile()) {
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 800;
    sun.shadow.camera.left = -200; sun.shadow.camera.right = 200;
    sun.shadow.camera.top = 200; sun.shadow.camera.bottom = -200;
  }
  s.add(sun);
  s.add(new THREE.HemisphereLight(0x87ceeb, 0x3a5a2a, 0.4));
  s.fog = new THREE.FogExp2(0x9ab5cc, isMobile() ? 0.005 : 0.003);

  // Terrain
  s.add(buildTerrain());

  // Water
  const wGeo = new THREE.PlaneGeometry(400, 400);
  wGeo.rotateX(-Math.PI / 2);
  waterMesh = new THREE.Mesh(wGeo, new THREE.MeshLambertMaterial({ color: 0x1a6aaa, transparent: true, opacity: 0.75 }));
  waterMesh.position.set(-200, -3, 200);
  s.add(waterMesh);

  // Highlight Ring
  const ringGeo = new THREE.RingGeometry(0.8, 1.1, 32);
  ringGeo.rotateX(-Math.PI / 2);
  highlightRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthTest: false }));
  highlightRing.visible = false;
  s.add(highlightRing);

  // Trees (fewer on mobile)
  const treePositions = isMobile()
    ? [[150,50],[180,80],[200,120],[300,200],[-200,-100]]
    : [[150,50],[180,80],[200,120],[160,150],[-100,80],[-80,120],[300,200],[320,180],[-200,-100],[100,-150],[250,300],[280,320],[-150,200],[-180,220],[400,100]];

  treePositions.forEach(([tx, tz]) => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.6, 4, 6),
      new THREE.MeshLambertMaterial({ color: 0x4a2a0a })
    );
    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(3 + Math.random() * 2, 6 + Math.random() * 3, 7),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(0.1 + Math.random() * 0.1, 0.4 + Math.random() * 0.2, 0.1) })
    );
    leaves.position.y = 5;
    g.add(trunk); g.add(leaves);
    g.position.set(tx, getTerrainHeight(tx, tz), tz);
    g.scale.setScalar(0.8 + Math.random() * 0.6);
    g.rotation.y = Math.random() * Math.PI * 2;
    if (!isMobile()) { trunk.castShadow = true; leaves.castShadow = true; }
    s.add(g);
  });

  // Village buildings
  const buildings = [
    { x:20, z:20, w:12, d:10, h:8, c:0x8a7a6a },
    { x:50, z:20, w:10, d:8, h:6, c:0x9a8a7a },
    { x:20, z:50, w:8, d:8, h:7, c:0x7a8a6a },
    { x:50, z:50, w:14, d:12, h:10, c:0x6a7a9a },
  ];
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x8a7a5a });
  buildings.forEach(b => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), new THREE.MeshLambertMaterial({ color: b.c }));
    mesh.position.set(b.x, b.h/2, b.z);
    if (!isMobile()) mesh.castShadow = true;
    s.add(mesh);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(b.w,b.d)*0.8, 3, 4), new THREE.MeshLambertMaterial({ color: 0x6a3a1a }));
    roof.position.set(b.x, b.h+1.5, b.z); roof.rotation.y = Math.PI/4; s.add(roof);
  });

  // Village walls
  [[32,-10,100,2,6],[32,74,100,2,6],[-18,32,2,84,6],[82,32,2,84,6]].forEach(([x,z,w,d,h]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat);
    m.position.set(x,h/2,z); s.add(m);
  });

  // Torches / lights near village entrance
  if (!isMobile()) {
    [[-15, 30], [-15, 35], [80, 30], [80, 35]].forEach(([tx, tz]) => {
      const torchLight = new THREE.PointLight(0xff8800, 2, 20);
      torchLight.position.set(tx, 5, tz);
      s.add(torchLight);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.3, 4, 4), new THREE.MeshBasicMaterial({ color: 0xff8800 }));
      flame.position.set(tx, 5, tz);
      s.add(flame);
    });
  }
}

export function initRenderer(
  canvas: HTMLCanvasElement,
  playerId: string,
  wsCallbacks?: {
    onAttack: () => void;
    onInteract: () => void;
    onEquip: () => void;
    onInventory: () => void;
    onQuests: () => void;
    onSkills: () => void;
    onMap: () => void;
    onChat: () => void;
  }
) {
  myPlayerId = playerId;
  clock = new THREE.Clock();

  // Mobile-aware pixel ratio
  const pixelRatio = isMobile() ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile() });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled = !isMobile();
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1500);
  buildScene(scene);

  // ── DESKTOP: Mouse camera controls ──────────────────────────────────────
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 2) { isDragging = true; lastMouseX = e.clientX; lastMouseY = e.clientY; }
  });
  window.addEventListener("mouseup", () => { isDragging = false; });
  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    cameraAngleH -= (e.clientX - lastMouseX) * 0.005;
    cameraAngleV = Math.max(0.1, Math.min(1.4, cameraAngleV - (e.clientY - lastMouseY) * 0.005));
    lastMouseX = e.clientX; lastMouseY = e.clientY;
  });
  canvas.addEventListener("wheel", (e) => {
    cameraDistance = Math.max(5, Math.min(60, cameraDistance + e.deltaY * 0.05));
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // ── MOBILE: Initialize touch controls ───────────────────────────────────
  if (wsCallbacks) {
    initMobileControls(
      wsCallbacks,
      // Pinch zoom callback
      (delta: number) => {
        cameraDistance = Math.max(5, Math.min(60, cameraDistance + delta));
      },
      // Camera drag callback
      (dx: number, dy: number) => {
        cameraAngleH -= dx * 0.008;
        cameraAngleV = Math.max(0.1, Math.min(1.4, cameraAngleV - dy * 0.008));
      }
    );
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ── ANIMATION LOOP ───────────────────────────────────────────────────────
  let joystickAccumX = 0;
  let joystickAccumY = 0;
  const JOYSTICK_SEND_INTERVAL = 100; // ms
  let lastJoystickSend = 0;

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();
    const lf = Math.min(1, delta * 12);

    // Water animation
    if (waterMesh) {
      waterMesh.position.y = -3 + Math.sin(elapsed * 0.5) * 0.2;
    }

    if (highlightRing && highlightRing.visible) {
      highlightPulse += delta * 3;
      highlightRing.rotation.z += delta; // Rotates horizontally because X is rotated -PI/2
      const scale = 1 + Math.sin(highlightPulse) * 0.1;
      highlightRing.scale.set(scale, scale, scale);
      (highlightRing.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(highlightPulse * 2) * 0.3;
    }

    // Smooth player/NPC movement
    for (const [id, mesh] of playerMeshes) {
      const t = targetPositions.get(id);
      if (t) mesh.position.lerp(t, lf);
    }
    for (const [id, mesh] of npcMeshes) {
      const t = targetPositions.get(id);
      if (t) mesh.position.lerp(t, lf * 0.8);
    }

    // Camera follows player
    const myMesh = playerMeshes.get(myPlayerId || "");
    if (myMesh) cameraTarget.lerp(myMesh.position, 0.1);

    // Joystick movement (mobile)
    const js = getJoystickState();
    if (js.active && onJoystickMove) {
      joystickAccumX += js.dx * delta * 120;
      joystickAccumY += js.dy * delta * 120;
      const now = Date.now();
      if (now - lastJoystickSend > JOYSTICK_SEND_INTERVAL && (Math.abs(joystickAccumX) > 0.5 || Math.abs(joystickAccumY) > 0.5)) {
        // Convert joystick direction to world-space based on camera angle
        const cos = Math.cos(cameraAngleH);
        const sin = Math.sin(cameraAngleH);
        const worldDX = joystickAccumX * cos - joystickAccumY * sin;
        const worldDY = joystickAccumX * sin + joystickAccumY * cos;
        onJoystickMove(worldDX, worldDY);
        joystickAccumX = 0;
        joystickAccumY = 0;
        lastJoystickSend = now;
      }
    }

    // Update camera position
    camera.position.set(
      cameraTarget.x + Math.sin(cameraAngleH) * Math.cos(cameraAngleV) * cameraDistance,
      cameraTarget.y + Math.sin(cameraAngleV) * cameraDistance,
      cameraTarget.z + Math.cos(cameraAngleH) * Math.cos(cameraAngleV) * cameraDistance
    );
    camera.lookAt(cameraTarget.x, cameraTarget.y + 1, cameraTarget.z);
    renderer.render(scene, camera);
  }
  animate();
}

export function updateWorldState(state: any, playerId: string | null) {
  if (!scene) return;
  myPlayerId = playerId;

  // Players
  const currentPlayers = new Set<string>();
  for (const p of state.players || []) {
    currentPlayers.add(p.id);
    if (!playerMeshes.has(p.id)) {
      const isMe = p.id === playerId;
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.5, 1.5, 4, 8),
        new THREE.MeshLambertMaterial({ color: isMe ? 0x00cc66 : 0x4466cc })
      );
      body.position.y = 1.25; body.castShadow = !isMobile();
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 8, 8),
        new THREE.MeshLambertMaterial({ color: isMe ? 0x00ff88 : 0x6688ee })
      );
      head.position.y = 2.4; head.castShadow = !isMobile();
      const g = new THREE.Group(); g.add(body); g.add(head);
      g.position.set(p.position.x, getTerrainHeight(p.position.x, p.position.y), p.position.y);
      scene.add(g); playerMeshes.set(p.id, g);
    }
    let t = targetPositions.get(p.id);
    if (!t) { t = new THREE.Vector3(); targetPositions.set(p.id, t); }
    t.set(p.position.x, getTerrainHeight(p.position.x, p.position.y), p.position.y);
    const sp = projectToScreen(t.x, t.y + 3.5, t.z);
    const lbl = createWorldLabel(p.id, p.name || "Player", "player");
    if (sp.inFront) { lbl.style.left=`${sp.x}px`; lbl.style.top=`${sp.y}px`; lbl.style.display="block"; } else lbl.style.display="none";
  }
  for (const [id, mesh] of playerMeshes) {
    if (!currentPlayers.has(id)) { scene.remove(mesh); playerMeshes.delete(id); targetPositions.delete(id); removeWorldLabel(id); }
  }

  // NPCs
  const currentNPCs = new Set<string>();
  for (const npc of state.npcs || []) {
    currentNPCs.add(npc.id);
    if (!npcMeshes.has(npc.id)) {
      if (npc.glbPath) {
        const g = new THREE.Group();
        g.position.set(npc.position.x, getTerrainHeight(npc.position.x, npc.position.y), npc.position.y);
        scene.add(g); npcMeshes.set(npc.id, g);
        loadModel(npc.glbPath.replace(/^public\//, ""), (m) => { m.scale.set(0.5,0.5,0.5); g.add(m); });
      } else {
        const isM = npc.role === "monster";
        const isShop = npc.role === "shopkeeper";
        const c = isM ? 0xcc2222 : isShop ? 0xffaa00 : 0xddbb88;
        const body = new THREE.Mesh(
          new THREE.CapsuleGeometry(isM?0.6:0.45, isM?1.8:1.4, 4, 8),
          new THREE.MeshLambertMaterial({ color: c })
        );
        body.position.y = isM?1.4:1.1; body.castShadow = !isMobile();
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(isM?0.5:0.35, 8, 8),
          new THREE.MeshLambertMaterial({ color: isM?0xee3333:0xffccaa })
        );
        head.position.y = isM?2.7:2.2;
        const g = new THREE.Group(); g.add(body); g.add(head);
        g.position.set(npc.position.x, getTerrainHeight(npc.position.x, npc.position.y), npc.position.y);
        scene.add(g); npcMeshes.set(npc.id, g);
      }
    }
    let t = targetPositions.get(npc.id);
    if (!t) { t = new THREE.Vector3(); targetPositions.set(npc.id, t); }
    t.set(npc.position.x, getTerrainHeight(npc.position.x, npc.position.y), npc.position.y);
    const hp = npc.maxHealth ? (npc.health / npc.maxHealth) : 1;
    const lbl = createWorldLabel(npc.id, npc.name || npc.id, "npc", hp);
    const sp = projectToScreen(t.x, t.y + 3, t.z);
    if (sp.inFront && cameraDistance < 50) { lbl.style.left=`${sp.x}px`; lbl.style.top=`${sp.y}px`; lbl.style.display="block"; } else lbl.style.display="none";
  }
  for (const [id, mesh] of npcMeshes) {
    if (!currentNPCs.has(id)) { scene.remove(mesh); npcMeshes.delete(id); targetPositions.delete(id); removeWorldLabel(id); }
  }

  // Loot
  const currentLoot = new Set<string>();
  for (const loot of state.loot || []) {
    currentLoot.add(loot.id);
    if (!lootMeshes.has(loot.id)) {
      const rc: Record<string,number> = { common:0xaaaaaa, uncommon:0x00cc00, rare:0x0088ff, epic:0xaa44ff, legendary:0xff8800 };
      const c = rc[loot.rarity || loot.item?.rarity || "common"] || 0xffd700;
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.5, 0),
        new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.3 })
      );
      mesh.position.set(loot.position.x, getTerrainHeight(loot.position.x, loot.position.y) + 0.8, loot.position.y);
      scene.add(mesh); lootMeshes.set(loot.id, mesh);
    }
    const lm = lootMeshes.get(loot.id) as THREE.Mesh;
    if (lm) {
      const et = Date.now() * 0.002;
      lm.position.y = getTerrainHeight(loot.position.x, loot.position.y) + 0.8 + Math.sin(et + loot.position.x) * 0.2;
      lm.rotation.y += 0.02;
      const sp = projectToScreen(lm.position.x, lm.position.y + 1, lm.position.z);
      const name = loot.item?.name || loot.name || "Item";
      const lbl = createWorldLabel(loot.id, name, "loot");
      if (sp.inFront && cameraDistance < 30) { lbl.style.left=`${sp.x}px`; lbl.style.top=`${sp.y}px`; lbl.style.display="block"; } else lbl.style.display="none";
    }
  }
  for (const [id, mesh] of lootMeshes) {
    if (!currentLoot.has(id)) { scene.remove(mesh); lootMeshes.delete(id); removeWorldLabel(id); }
  }

  // Interaction tooltip
  const myMesh = playerMeshes.get(playerId || "");
  if (myMesh) {
    const nearby = getClosestInteractable({ x: myMesh.position.x, y: myMesh.position.z }, state.npcs || [], state.loot || []);
    if (nearby) {
      const hint = isMobile() ? "Tap [E]" : "[E]";
      showTooltip(`${hint} ${nearby.type === "loot" ? "Pick up" : "Talk to"} ${nearby.name || nearby.id}`);

      if (highlightRing) {
        highlightRing.visible = true;
        highlightRing.position.set(nearby.position.x, getTerrainHeight(nearby.position.x, nearby.position.y) + 0.1, nearby.position.y);
        (highlightRing.material as THREE.MeshBasicMaterial).color.setHex(nearby.type === "loot" ? 0xffd700 : 0x00ff88);
      }
    } else {
      hideTooltip();
      if (highlightRing) highlightRing.visible = false;
    }
  }

  updateMinimap(state, playerId);
}

export function showFloatingTextAt(text: string, worldX: number, worldZ: number, color = "#ff4444") {
  const sp = projectToScreen(worldX, getTerrainHeight(worldX, worldZ) + 3, worldZ);
  if (sp.inFront) showFloatingText(text, sp.x, sp.y, color);
}
