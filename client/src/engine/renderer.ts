import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { showTooltip, hideTooltip, createWorldLabel, removeWorldLabel } from "../ui/hud";
import { getClosestInteractable } from "../utils/interaction";

const gltfLoader = new GLTFLoader();
const modelCache = new Map<string, THREE.Group>();

function loadModel(path: string, callback: (model: THREE.Group) => void) {
  if (modelCache.has(path)) {
    callback(modelCache.get(path)!.clone());
    return;
  }
  gltfLoader.load(path, (gltf) => {
    modelCache.set(path, gltf.scene);
    callback(gltf.scene.clone());
  }, undefined, (error) => {
    console.error("Error loading model:", path, error);
  });
}

function projectToScreen(x: number, y: number, z: number) {
  const vector = new THREE.Vector3(x, y, z);
  vector.project(camera);
  return {
    x: (vector.x + 1) / 2 * window.innerWidth,
    y: -(vector.y - 1) / 2 * window.innerHeight
  };
}

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;

const playerMeshes = new Map<string, THREE.Mesh>();
const npcMeshes = new Map<string, THREE.Object3D>();
const lootMeshes = new Map<string, THREE.Object3D>();
const chunkMeshes = new Map<string, THREE.LineSegments>();
const activeLabels = new Set<string>();

// For interpolation
const targetPositions = new Map<string, THREE.Vector3>();

export function showFloatingText(text: string, x: number, y: number) {
  const vector = new THREE.Vector3(x, 2, y);
  vector.project(camera);
  const screenX = (vector.x + 1) / 2 * window.innerWidth;
  const screenY = -(vector.y - 1) / 2 * window.innerHeight;
  
  const div = document.createElement("div");
  div.style.position = "fixed";
  div.style.left = `${screenX}px`;
  div.style.top = `${screenY}px`;
  div.style.color = "#ff0000";
  div.style.fontWeight = "bold";
  div.style.fontSize = "20px";
  div.style.pointerEvents = "none";
  div.style.zIndex = "1001";
  div.textContent = text;
  document.body.appendChild(div);
  
  div.animate([
    { transform: "translateY(0)", opacity: 1 },
    { transform: "translateY(-50px)", opacity: 0 }
  ], {
    duration: 1000,
    easing: "ease-out"
  }).onfinish = () => div.remove();
}
export function initRenderer(canvas: HTMLCanvasElement, myPlayerId: string) {
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
    
    let target = targetPositions.get(p.id);
    if (!target) {
      target = new THREE.Vector3();
      targetPositions.set(p.id, target);
    }
    target.set(p.position.x, 2, p.position.y);
  }

  // Remove disconnected players
  for (const [id, mesh] of playerMeshes.entries()) {
    if (!currentPlayers.has(id)) {
      scene.remove(mesh);
      playerMeshes.delete(id);
      targetPositions.delete(id);
    }
  }

  // Render NPCs (Red spheres or GLB)
  const currentNPCs = new Set<string>();
  for (const npc of state.npcs) {
    currentNPCs.add(npc.id);
    if (!npcMeshes.has(npc.id)) {
      if (npc.glbPath) {
        // Create a placeholder while loading
        const group = new THREE.Group();
        group.position.set(npc.position.x, 0, npc.position.y);
        scene.add(group);
        npcMeshes.set(npc.id, group);

        // Remove "public/" from path if it exists, as client serves from public
        const modelPath = npc.glbPath.replace(/^public\//, '');
        
        loadModel(modelPath, (model) => {
          // Scale down the model to fit game world better
          model.scale.set(0.5, 0.5, 0.5);
          group.add(model);
        });
      } else {
        const geo = new THREE.SphereGeometry(2);
        const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(npc.position.x, 2, npc.position.y);
        scene.add(mesh);
        npcMeshes.set(npc.id, mesh);
      }
    }
    
    let target = targetPositions.get(npc.id);
    if (!target) {
      target = new THREE.Vector3();
      targetPositions.set(npc.id, target);
    }
    // Adjust Y position based on whether it's a GLB or sphere
    const yPos = npc.glbPath ? 0 : 2;
    target.set(npc.position.x, yPos, npc.position.y);
    
    // Position label above NPC
    const screenPos = projectToScreen(npc.position.x, 6, npc.position.y);
    const label = createWorldLabel(npc.id, npc.name, 'npc', npc.health / npc.maxHealth);
    label.style.left = `${screenPos.x}px`;
    label.style.top = `${screenPos.y}px`;
    label.style.transform = "translate(-50%, -100%)";
    activeLabels.add(npc.id);
  }

  // Remove despawned NPCs
  for (const [id, mesh] of npcMeshes.entries()) {
    if (!currentNPCs.has(id)) {
      scene.remove(mesh);
      npcMeshes.delete(id);
    }
  }

  // Render Loot (Thematic bag/chest or GLB)
  const currentLoot = new Set<string>();
  for (const loot of state.loot) {
    currentLoot.add(loot.id);
    const lootGroup = lootMeshes.get(loot.id);
    if (!lootGroup) {
      const group = new THREE.Group();
      group.position.set(loot.position.x, 0, loot.position.y);
      scene.add(group);
      lootMeshes.set(loot.id, group);

      if (loot.glbPath) {
        const modelPath = loot.glbPath.replace(/^public\//, '');
        loadModel(modelPath, (model) => {
          model.scale.set(0.5, 0.5, 0.5);
          group.add(model);
        });
      } else {
        // Base
        const baseGeo = new THREE.BoxGeometry(2, 1.5, 2);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.y = 0.75;
        group.add(baseMesh);
        // Lid
        const lidGeo = new THREE.BoxGeometry(2.2, 0.5, 2.2);
        const lidMat = new THREE.MeshStandardMaterial({ color: 0x5D2E0A });
        const lidMesh = new THREE.Mesh(lidGeo, lidMat);
        lidMesh.position.y = 1.75;
        group.add(lidMesh);
      }
    } else {
      lootGroup.position.set(loot.position.x, 0, loot.position.y);
    }
    
    // Position label above loot
    const screenPos = projectToScreen(loot.position.x, 4, loot.position.y);
    const label = createWorldLabel(loot.id, loot.item.name, 'loot');
    label.style.left = `${screenPos.x}px`;
    label.style.top = `${screenPos.y}px`;
    label.style.transform = "translate(-50%, -100%)";
    activeLabels.add(loot.id);
  }

  // Remove picked up loot
  for (const [id, mesh] of lootMeshes.entries()) {
    if (!currentLoot.has(id)) {
      scene.remove(mesh);
      lootMeshes.delete(id);
    }
  }

  // Tooltip logic
  const myPlayer = state.players.find((p: any) => p.id === myPlayerId);
  if (myPlayer) {
    const closestInteractable = getClosestInteractable(myPlayer, state);

    if (closestInteractable) {
      if (closestInteractable.interactionType === 'loot') {
        const item = closestInteractable.item;
        const rarity = item.rarity || 'Common';
        const damage = item.damage ? ` | Dmg: ${item.damage}` : '';
        showTooltip(`Press E to pick up ${item.name} (${item.type}) [${rarity}]${damage}`);
      } else {
        showTooltip(`Press E to interact with ${closestInteractable.name || 'NPC'}`);
      }
    } else {
      hideTooltip();
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

  // Remove inactive labels
  const allLabelIds = new Set(Array.from(document.querySelectorAll('[id^="label-"]')).map(el => el.id.replace('label-', '')));
  for (const id of allLabelIds) {
    if (!activeLabels.has(id)) {
      removeWorldLabel(id);
    }
  }
  activeLabels.clear();

  // Remove inactive chunks
  for (const [id, mesh] of chunkMeshes.entries()) {
    if (!currentChunks.has(id)) {
      scene.remove(mesh);
      chunkMeshes.delete(id);
    }
  }
}