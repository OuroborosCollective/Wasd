import * as THREE from "three";

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;

const playerMeshes = new Map<string, THREE.Mesh>();
const npcMeshes = new Map<string, THREE.Mesh>();
const chunkMeshes = new Map<string, THREE.LineSegments>();

// For interpolation
const targetPositions = new Map<string, THREE.Vector3>();

export function initRenderer(canvas: HTMLCanvasElement) {
  renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 100, 100);
  camera.lookAt(0, 0, 0);

  // Add a simple grid helper for the ground
  const gridHelper = new THREE.GridHelper(1000, 100, 0x444444, 0x444444);
  scene.add(gridHelper);

  // Add a "Town" marker
  const townGeo = new THREE.PlaneGeometry(128, 128);
  const townMat = new THREE.MeshBasicMaterial({ color: 0x334433, side: THREE.DoubleSide });
  const town = new THREE.Mesh(townGeo, townMat);
  town.rotation.x = Math.PI / 2;
  town.position.set(32, 0.1, 32);
  scene.add(town);

  // Add an "Outpost" marker
  const outpostGeo = new THREE.PlaneGeometry(64, 64);
  const outpostMat = new THREE.MeshBasicMaterial({ color: 0x443333, side: THREE.DoubleSide });
  const outpost = new THREE.Mesh(outpostGeo, outpostMat);
  outpost.rotation.x = Math.PI / 2;
  outpost.position.set(500, 0.1, 500);
  scene.add(outpost);

  // Add a "Combat Training" marker
  const trainingGeo = new THREE.PlaneGeometry(32, 32);
  const trainingMat = new THREE.MeshBasicMaterial({ color: 0x444433, side: THREE.DoubleSide });
  const training = new THREE.Mesh(trainingGeo, trainingMat);
  training.rotation.x = Math.PI / 2;
  training.position.set(64, 0.1, 64);
  scene.add(training);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(100, 200, 50);
  scene.add(directionalLight);

  function animate() {
    // Interpolate positions
    const lerpFactor = 0.2;
    
    for (const [id, mesh] of playerMeshes.entries()) {
      const target = targetPositions.get(id);
      if (target) {
        mesh.position.lerp(target, lerpFactor);
        
        // Follow camera if it's our player (we'll need a way to identify our player)
        // For now, we'll check the material color as a hack or pass myPlayerId
        if ((mesh.material as THREE.MeshStandardMaterial).color.getHex() === 0x00ff00) {
          camera.position.set(mesh.position.x, 100, mesh.position.z + 100);
          camera.lookAt(mesh.position.x, 0, mesh.position.z);
        }
      }
    }

    for (const [id, mesh] of npcMeshes.entries()) {
      const target = targetPositions.get(id);
      if (target) {
        mesh.position.lerp(target, lerpFactor);
      }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}

export function updateWorldState(state: any, myPlayerId: string | null) {
  if (!scene) return;

  // Render players (Blue cubes)
  const currentPlayers = new Set<string>();
  for (const p of state.players) {
    currentPlayers.add(p.id);
    if (!playerMeshes.has(p.id)) {
      const geo = new THREE.BoxGeometry(4, 4, 4);
      const mat = new THREE.MeshStandardMaterial({ color: p.id === myPlayerId ? 0x00ff00 : 0x0000ff });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.position.x, 2, p.position.y);
      scene.add(mesh);
      playerMeshes.set(p.id, mesh);
    }
    targetPositions.set(p.id, new THREE.Vector3(p.position.x, 2, p.position.y));
  }

  // Remove disconnected players
  for (const [id, mesh] of playerMeshes.entries()) {
    if (!currentPlayers.has(id)) {
      scene.remove(mesh);
      playerMeshes.delete(id);
      targetPositions.delete(id);
    }
  }

  // Render NPCs (Red spheres)
  const currentNPCs = new Set<string>();
  for (const npc of state.npcs) {
    currentNPCs.add(npc.id);
    if (!npcMeshes.has(npc.id)) {
      const geo = new THREE.SphereGeometry(2);
      const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(npc.position.x, 2, npc.position.y);
      scene.add(mesh);
      npcMeshes.set(npc.id, mesh);
    }
    targetPositions.set(npc.id, new THREE.Vector3(npc.position.x, 2, npc.position.y));
  }

  // Remove despawned NPCs
  for (const [id, mesh] of npcMeshes.entries()) {
    if (!currentNPCs.has(id)) {
      scene.remove(mesh);
      npcMeshes.delete(id);
    }
  }

  // Render Active Chunks (Yellow boundaries)
  const currentChunks = new Set<string>();
  if (state.activeChunkIds) {
    for (const chunkId of state.activeChunkIds) {
      currentChunks.add(chunkId);
      if (!chunkMeshes.has(chunkId)) {
        const [cx, cy] = chunkId.split(':').map(Number);
        const chunkSize = 64;
        
        // Create a square outline for the chunk
        const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(chunkSize, 1, chunkSize));
        const mat = new THREE.LineBasicMaterial({ color: 0xffff00 });
        const mesh = new THREE.LineSegments(geo, mat);
        
        // Center of the chunk
        mesh.position.set(cx * chunkSize + chunkSize/2, 0.5, cy * chunkSize + chunkSize/2);
        scene.add(mesh);
        chunkMeshes.set(chunkId, mesh);
      }
    }
  }

  // Remove inactive chunks
  for (const [id, mesh] of chunkMeshes.entries()) {
    if (!currentChunks.has(id)) {
      scene.remove(mesh);
      chunkMeshes.delete(id);
    }
  }
}