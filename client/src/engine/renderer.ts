import * as THREE from "three";

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;

const playerMeshes = new Map<string, THREE.Mesh>();
const npcMeshes = new Map<string, THREE.Mesh>();
const chunkMeshes = new Map<string, THREE.LineSegments>();

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

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(100, 200, 50);
  scene.add(directionalLight);

  function animate() {
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
      scene.add(mesh);
      playerMeshes.set(p.id, mesh);
    }
    const mesh = playerMeshes.get(p.id)!;
    mesh.position.set(p.position.x, 2, p.position.y); // y is up in Three.js, z is depth. We map server y to z.
    
    // Follow camera if it's our player
    if (p.id === myPlayerId) {
      camera.position.set(p.position.x, 100, p.position.y + 100);
      camera.lookAt(p.position.x, 0, p.position.y);
    }
  }

  // Remove disconnected players
  for (const [id, mesh] of playerMeshes.entries()) {
    if (!currentPlayers.has(id)) {
      scene.remove(mesh);
      playerMeshes.delete(id);
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
      scene.add(mesh);
      npcMeshes.set(npc.id, mesh);
    }
    const mesh = npcMeshes.get(npc.id)!;
    mesh.position.set(npc.position.x, 2, npc.position.y);
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