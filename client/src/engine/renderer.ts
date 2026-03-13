import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
const playerMeshes: Map<string, THREE.Object3D> = new Map();
const npcMeshes: Map<string, THREE.Object3D> = new Map();
const lootMeshes: Map<string, THREE.Mesh> = new Map(); // Geändert zu Mesh für einfache Würfel
const chunkMeshes: Map<string, THREE.LineSegments> = new Map();
const targetPositions: Map<string, THREE.Vector3> = new Map();
const activeLabels = new Set<string>();

const loader = new GLTFLoader();

function loadModel(path: string, callback: (model: THREE.Group) => void) {
  loader.load(path, (gltf) => {
    callback(gltf.scene);
  }, undefined, (error) => {
    console.error('Error loading model:', path, error);
  });
}

function projectToScreen(worldX: number, worldY: number, worldZ: number) {
  if (!camera) return { x: 0, y: 0 };
  const vector = new THREE.Vector3(worldX, worldY, worldZ);
  vector.project(camera);
  return {
    x: (vector.x * 0.5 + 0.5) * window.innerWidth,
    y: (-(vector.y * 0.5) + 0.5) * window.innerHeight
  };
}

function createWorldLabel(id: string, text: string, type: 'player' | 'npc' | 'loot', healthPercent?: number) {
  let label = document.getElementById(`label-${id}`);
  if (!label) {
    label = document.createElement('div');
    label.id = `label-${id}`;
    label.className = 'world-label';
    label.style.position = 'absolute';
    label.style.pointerEvents = 'none';
    label.style.color = '#fff';
    label.style.textShadow = '1px 1px 2px #000';
    label.style.fontSize = '12px';
    label.style.textAlign = 'center';
    label.style.zIndex = '1000';
    document.body.appendChild(label);
  }

  let content = `<div>${text}</div>`;
  if (healthPercent !== undefined) {
    const color = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.2 ? '#ffff00' : '#ff0000';
    content += `<div style="width: 40px; height: 4px; background: #333; margin: 2px auto; border: 1px solid #000;">
      <div style="width: ${healthPercent * 100}%; height: 100%; background: ${color};"></div>
    </div>`;
  }
  label.innerHTML = content;
  return label;
}

function removeWorldLabel(id: string) {
  const label = document.getElementById(`label-${id}`);
  if (label) label.remove();
}

function getClosestInteractable(player: any, state: any) {
  let closest = null;
  let minDist = 20;

  for (const npc of state.npcs) {
    const d = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y);
    if (d < minDist) {
      minDist = d;
      closest = { ...npc, interactionType: 'npc' };
    }
  }

  // Render Loot (einfache Würfel, Farbe basierend auf Rarity)
  const currentLoot = new Set<string>();
  for (const loot of state.loot) {
    currentLoot.add(loot.id);
    if (!lootMeshes.has(loot.id)) {
      const geo = new THREE.BoxGeometry(2, 2, 2);
      const mat = new THREE.MeshStandardMaterial({
        color: getRarityColor(loot.rarity),
        roughness: 0.7,
        metalness: 0.3
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.set(loot.position.x, 1, loot.position.z);
      scene.add(mesh);
      lootMeshes.set(loot.id, mesh);
    }

    let target = targetPositions.get(loot.id);
    if (!target) {
      target = new THREE.Vector3();
      targetPositions.set(loot.id, target);
    }
    target.set(loot.position.x, 1, loot.position.z);

    const screenPos = projectToScreen(loot.position.x, 3, loot.position.z);
    const label = createWorldLabel(loot.id, loot.item.baseItem.name, 'loot');
    label.style.left = `${screenPos.x}px`;
    label.style.top = `${screenPos.y}px`;
    label.style.transform = "translate(-50%, -100%)";
    activeLabels.add(loot.id);
  }

  // Remove despawned loot
  for (const [id, mesh] of lootMeshes.entries()) {
    if (!currentLoot.has(id)) {
      scene.remove(mesh);
      lootMeshes.delete(id);
      targetPositions.delete(id);
      removeWorldLabel(id);
    }
  }

  for (const loot of state.loot) {
    const d = Math.hypot(player.position.x - loot.position.x, player.position.y - loot.position.y);
    if (d < minDist) {
      minDist = d;
      closest = { ...loot, interactionType: 'loot' };
    }
  }

    return closest;
  }

  function getRarityColor(rarity: string): number {
    switch (rarity) {
      case 'common': return 0x808080;
      case 'uncommon': return 0x00ff00;
      case 'rare': return 0x0066ff;
      case 'epic': return 0x9900ff;
      case 'legendary': return 0xffaa00;
      default: return 0xffffff;
    }
  }
}

function showTooltip(text: string) {
  let tooltip = document.getElementById('world-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'world-tooltip';
    tooltip.style.position = 'fixed';
    tooltip.style.bottom = '100px';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translateX(-50%)';
    tooltip.style.background = 'rgba(0,0,0,0.7)';
    tooltip.style.color = '#fff';
    tooltip.style.padding = '5px 15px';
    tooltip.style.borderRadius = '20px';
    tooltip.style.fontSize = '14px';
    tooltip.style.zIndex = '1001';
    document.body.appendChild(tooltip);
  }
  tooltip.textContent = text;
  tooltip.style.display = 'block';
}

function hideTooltip() {
  const tooltip = document.getElementById('world-tooltip');
  if (tooltip) tooltip.style.display = 'none';
}

export function showFloatingText(worldX: number, worldY: number, text: string) {
  const { x: screenX, y: screenY } = projectToScreen(worldX, 5, worldY);
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
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB); // Sky blue
  scene.fog = new THREE.FogExp2(0x87CEEB, 0.002);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 150, 150);
  camera.lookAt(0, 0, 0);

  // Improved Ground with procedural "texture" look using a canvas
  const size = 2048;
  const groundCanvas = document.createElement('canvas');
  groundCanvas.width = 512;
  groundCanvas.height = 512;
  const ctx = groundCanvas.getContext('2d')!;
  ctx.fillStyle = '#3a5a3a';
  ctx.fillRect(0, 0, 512, 512);
  for(let i=0; i<5000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
    ctx.fillRect(Math.random()*512, Math.random()*512, 2, 2);
  }
  const groundTex = new THREE.CanvasTexture(groundCanvas);
  groundTex.wrapS = THREE.RepeatWrapping;
  groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.repeat.set(50, 50);

  const groundGeo = new THREE.PlaneGeometry(size, size);
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.8,
    metalness: 0.1
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Add a simple grid helper but more subtle
  const gridHelper = new THREE.GridHelper(size, 100, 0x000000, 0x000000);
  gridHelper.position.y = 0.05;
  (gridHelper.material as THREE.Material).opacity = 0.1;
  (gridHelper.material as THREE.Material).transparent = true;
  scene.add(gridHelper);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(200, 400, 100);
  directionalLight.castShadow = true;
  directionalLight.shadow.camera.left = -1000;
  directionalLight.shadow.camera.right = 1000;
  directionalLight.shadow.camera.top = 1000;
  directionalLight.shadow.camera.bottom = -1000;
  directionalLight.shadow.camera.far = 2000;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);

  function animate() {
    // Interpolate positions
    const lerpFactor = 0.15;
    
    for (const [id, mesh] of playerMeshes.entries()) {
      const target = targetPositions.get(id);
      if (target) {
        mesh.position.lerp(target, lerpFactor);
        
        if (id === myPlayerId) {
          const camTarget = new THREE.Vector3(mesh.position.x, 100, mesh.position.z + 120);
          camera.position.lerp(camTarget, 0.1);
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

  // Render players (Green/Blue rounded-ish boxes)
  const currentPlayers = new Set<string>();
  for (const p of state.players) {
    currentPlayers.add(p.id);
    if (!playerMeshes.has(p.id)) {
      const geo = new THREE.CapsuleGeometry(2, 4, 4, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: p.id === myPlayerId ? 0x00ff00 : 0x4444ff,
        roughness: 0.5,
        metalness: 0.2
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.set(p.position.x, 4, p.position.y);
      scene.add(mesh);
      playerMeshes.set(p.id, mesh);
    }
    
    let target = targetPositions.get(p.id);
    if (!target) {
      target = new THREE.Vector3();
      targetPositions.set(p.id, target);
    }
    target.set(p.position.x, 4, p.position.y);
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
        const group = new THREE.Group();
        group.position.set(npc.position.x, 0, npc.position.y);
        scene.add(group);
        npcMeshes.set(npc.id, group);

        const modelPath = npc.glbPath.replace(/^public\//, '');
        loadModel(modelPath, (model) => {
          model.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          model.scale.set(1.0, 1.0, 1.0);
          group.add(model);
        });
      } else {
        const geo = new THREE.SphereGeometry(3);
        const mat = new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.4 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(npc.position.x, 3, npc.position.y);
        scene.add(mesh);
        npcMeshes.set(npc.id, mesh);
      }
    }
    
    let target = targetPositions.get(npc.id);
    if (!target) {
      target = new THREE.Vector3();
      targetPositions.set(npc.id, target);
    }
    const yPos = npc.glbPath ? 0 : 3;
    target.set(npc.position.x, yPos, npc.position.y);
    
    const screenPos = projectToScreen(npc.position.x, 8, npc.position.y);
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

  // Render Loot
  const currentLoot = new Set<string>();
  // Render Loot (einfache Würfel, Farbe basierend auf Rarity)
  const currentLoot = new Set<string>();
  for (const loot of state.loot) {
    currentLoot.add(loot.id);
    if (!lootMeshes.has(loot.id)) {
      const geo = new THREE.BoxGeometry(2, 2, 2);
      const mat = new THREE.MeshStandardMaterial({
        color: getRarityColor(loot.rarity),
        roughness: 0.7,
        metalness: 0.3
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.set(loot.position.x, 1, loot.position.z);
      scene.add(mesh);
      lootMeshes.set(loot.id, mesh);
    }

    let target = targetPositions.get(loot.id);
    if (!target) {
      target = new THREE.Vector3();
      targetPositions.set(loot.id, target);
    }
    target.set(loot.position.x, 1, loot.position.z);

    const screenPos = projectToScreen(loot.position.x, 3, loot.position.z);
    const label = createWorldLabel(loot.id, loot.item.baseItem.name, 'loot');
    label.style.left = `${screenPos.x}px`;
    label.style.top = `${screenPos.y}px`;
    label.style.transform = "translate(-50%, -100%)";
    activeLabels.add(loot.id);
  }

  // Remove despawned loot
  for (const [id, mesh] of lootMeshes.entries()) {
    if (!currentLoot.has(id)) {
      scene.remove(mesh);
      lootMeshes.delete(id);
      targetPositions.delete(id);
      removeWorldLabel(id);
    }
  }

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
          model.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          model.scale.set(0.8, 0.8, 0.8);
          group.add(model);
        });
      } else {
        const baseGeo = new THREE.BoxGeometry(3, 2, 3);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.6 });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        baseMesh.position.y = 1;
        group.add(baseMesh);
      }
    } else {
      lootGroup.position.set(loot.position.x, 0, loot.position.y);
    }
    
    const screenPos = projectToScreen(loot.position.x, 5, loot.position.y);
    const label = createWorldLabel(loot.id, loot.item.name, 'loot');
    label.style.left = `${screenPos.x}px`;
    label.style.top = `${screenPos.y}px`;
    label.style.transform = "translate(-50%, -100%)";
    activeLabels.add(loot.id);
  }

  for (const [id, mesh] of lootMeshes.entries()) {
    if (!currentLoot.has(id)) {
      scene.remove(mesh);
      lootMeshes.delete(id);
    }
  }

  // Render Active Chunks
  const currentChunks = new Set<string>();
  if (state.activeChunkIds) {
    for (const chunkId of state.activeChunkIds) {
      currentChunks.add(chunkId);
      if (!chunkMeshes.has(chunkId)) {
        const [cx, cy] = chunkId.split(':').map(Number);
        const chunkSize = 64;
        const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(chunkSize, 0.5, chunkSize));
        const mat = new THREE.LineBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.3 });
        const mesh = new THREE.LineSegments(geo, mat);
        mesh.position.set(cx * chunkSize + chunkSize/2, 0.25, cy * chunkSize + chunkSize/2);
        scene.add(mesh);
        chunkMeshes.set(chunkId, mesh);
      }
    }
  }

  const allLabelIds = new Set(Array.from(document.querySelectorAll('[id^="label-"]')).map(el => el.id.replace('label-', '')));
  for (const id of allLabelIds) {
    if (!activeLabels.has(id)) {
      removeWorldLabel(id);
    }
  }
  activeLabels.clear();

  for (const [id, mesh] of chunkMeshes.entries()) {
    if (!currentChunks.has(id)) {
      scene.remove(mesh);
      chunkMeshes.delete(id);
    }
  }
}
