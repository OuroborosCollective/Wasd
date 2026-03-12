import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
const playerMeshes: Map<string, THREE.Object3D> = new Map();
const npcMeshes: Map<string, THREE.Object3D> = new Map();
const lootMeshes: Map<string, THREE.Group> = new Map();
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
  if (!camera) return { x: -1000, y: -1000, z: 1000 };
  const vector = new THREE.Vector3(worldX, worldY, worldZ);
  vector.project(camera);
  return {
    x: (vector.x * 0.5 + 0.5) * window.innerWidth,
    y: (-(vector.y * 0.5) + 0.5) * window.innerHeight,
    z: vector.z
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
    label.style.textShadow = '1px 1px 3px #000';
    label.style.fontSize = '12px';
    label.style.fontWeight = 'bold';
    label.style.textAlign = 'center';
    label.style.zIndex = '1000';
    document.body.appendChild(label);
  }

  let content = `<div style="padding: 2px 6px; background: rgba(0,0,0,0.3); border-radius: 4px;">${text}</div>`;
  if (healthPercent !== undefined) {
    const color = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.2 ? '#ffff00' : '#ff0000';
    content += `<div style="width: 40px; height: 4px; background: #333; margin: 2px auto; border: 1px solid #000;">
      <div style="width: ${healthPercent * 100}%; height: 100%; background: ${color};"></div>
    </div>`;
  }
  label.innerHTML = content;
  return label;
}

function getClosestInteractable(player: any, state: any) {
  let closest = null;
  let minDist = 25;

  for (const npc of state.npcs) {
    const d = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y);
    if (d < minDist) {
      minDist = d;
      closest = { ...npc, interactionType: 'npc' };
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

function showTooltip(text: string) {
  let tooltip = document.getElementById('world-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'world-tooltip';
    tooltip.style.position = 'fixed';
    tooltip.style.bottom = '120px';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translateX(-50%)';
    tooltip.style.background = 'rgba(0,0,0,0.85)';
    tooltip.style.color = '#00ff00';
    tooltip.style.padding = '10px 25px';
    tooltip.style.borderRadius = '12px';
    tooltip.style.fontSize = '18px';
    tooltip.style.fontWeight = 'bold';
    tooltip.style.border = '2px solid #00ff00';
    tooltip.style.zIndex = '1001';
    tooltip.style.boxShadow = '0 0 20px rgba(0,255,0,0.3)';
    document.body.appendChild(tooltip);
  }
  tooltip.textContent = text;
  tooltip.style.display = 'block';
}

function hideTooltip() {
  const tooltip = document.getElementById('world-tooltip');
  if (tooltip) tooltip.style.display = 'none';
}

export function showFloatingText(text: string, worldX: number, worldY: number) {
  const screenPos = projectToScreen(worldX, 10, worldY);
  if (screenPos.z > 1) return; // Behind camera

  const div = document.createElement("div");
  div.style.position = "fixed";
  div.style.left = `${screenPos.x}px`;
  div.style.top = `${screenPos.y}px`;
  div.style.color = text.startsWith('-') ? "#ff0000" : "#ffff00";
  div.style.fontWeight = "bold";
  div.style.fontSize = "26px";
  div.style.textShadow = "2px 2px 4px #000";
  div.style.pointerEvents = "none";
  div.style.zIndex = "1001";
  div.textContent = text;
  document.body.appendChild(div);
  
  div.animate([
    { transform: "translate(-50%, 0) scale(1)", opacity: 1 },
    { transform: "translate(-50%, -100px) scale(1.6)", opacity: 0 }
  ], {
    duration: 1200,
    easing: "ease-out"
  }).onfinish = () => div.remove();
}

export function initRenderer(canvas: HTMLCanvasElement, myPlayerId?: string) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x66aaff);
  scene.fog = new THREE.FogExp2(0x66aaff, 0.0008);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 4000);
  camera.position.set(0, 250, 250);
  camera.lookAt(0, 0, 0);

  // Advanced Procedural Ground
  const size = 5000;
  const groundCanvas = document.createElement('canvas');
  groundCanvas.width = 1024;
  groundCanvas.height = 1024;
  const ctx = groundCanvas.getContext('2d')!;
  ctx.fillStyle = '#2a442a';
  ctx.fillRect(0, 0, 1024, 1024);

  for(let i=0; i<60; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = 40 + Math.random() * 120;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(50, 35, 15, 0.5)');
    grad.addColorStop(1, 'rgba(50, 35, 15, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x-r, y-r, r*2, r*2);
  }

  for(let i=0; i<15000; i++) {
    const g = 40 + Math.random() * 30;
    ctx.fillStyle = `rgba(0,${g},0,0.1)`;
    ctx.fillRect(Math.random()*1024, Math.random()*1024, 3, 3);
  }

  const groundTex = new THREE.CanvasTexture(groundCanvas);
  groundTex.wrapS = THREE.RepeatWrapping;
  groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.repeat.set(80, 80);
  groundTex.anisotropy = 8;

  const groundGeo = new THREE.PlaneGeometry(size, size);
  const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1.0 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const sun = new THREE.DirectionalLight(0xfff5ee, 1.3);
  sun.position.set(400, 800, 300);
  sun.castShadow = true;
  sun.shadow.camera.left = -2000;
  sun.shadow.camera.right = 2000;
  sun.shadow.camera.top = 2000;
  sun.shadow.camera.bottom = -2000;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0001;
  scene.add(sun);

  function animate() {
    const lerpFactor = 0.15;
    
    for (const [id, mesh] of playerMeshes.entries()) {
      const target = targetPositions.get(id);
      if (target) {
        mesh.position.lerp(target, lerpFactor);
        if (id === (window as any).myPlayerId) {
          const camTarget = new THREE.Vector3(mesh.position.x, 180, mesh.position.z + 200);
          camera.position.lerp(camTarget, 0.1);
          camera.lookAt(mesh.position.x, 0, mesh.position.z);
        }
      }
    }

    for (const [id, mesh] of npcMeshes.entries()) {
      const target = targetPositions.get(id);
      if (target) mesh.position.lerp(target, lerpFactor);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}

export function updateWorldState(state: any, myPlayerId: string | null) {
  if (!scene) return;
  (window as any).myPlayerId = myPlayerId;

  // Render players
  const currentPlayers = new Set<string>();
  for (const p of state.players) {
    currentPlayers.add(p.id);
    if (!playerMeshes.has(p.id)) {
      const mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(2.5, 5, 4, 12),
        new THREE.MeshStandardMaterial({ color: p.id === myPlayerId ? 0x00ff00 : 0x5555ff, roughness: 0.5 })
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      playerMeshes.set(p.id, mesh);
    }
    const target = targetPositions.get(p.id) || new THREE.Vector3();
    target.set(p.position.x, 5, p.position.y);
    targetPositions.set(p.id, target);
  }

  for (const [id, mesh] of playerMeshes.entries()) {
    if (!currentPlayers.has(id)) {
      scene.remove(mesh);
      playerMeshes.delete(id);
      targetPositions.delete(id);
    }
  }

  // Render NPCs
  const currentNPCs = new Set<string>();
  for (const npc of state.npcs) {
    currentNPCs.add(npc.id);
    if (!npcMeshes.has(npc.id)) {
      const group = new THREE.Group();
      group.position.set(npc.position.x, 0, npc.position.y);
      scene.add(group);
      npcMeshes.set(npc.id, group);

      if (npc.glbPath) {
        loadModel(npc.glbPath.replace(/^public\//, ''), (model) => {
          model.traverse(c => { if ((c as THREE.Mesh).isMesh) { c.castShadow = c.receiveShadow = true; } });
          group.add(model);
        });
      } else {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(3.5), new THREE.MeshStandardMaterial({ color: 0xff3333 }));
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.position.y = 3.5;
        group.add(mesh);
      }
    }
    const target = targetPositions.get(npc.id) || new THREE.Vector3();
    target.set(npc.position.x, npc.glbPath ? 0 : 3.5, npc.position.y);
    targetPositions.set(npc.id, target);
    
    const sPos = projectToScreen(npc.position.x, 12, npc.position.y);
    if (sPos.z < 1 && sPos.x > 0 && sPos.x < window.innerWidth && sPos.y > 0 && sPos.y < window.innerHeight) {
      const label = createWorldLabel(npc.id, npc.name, 'npc', npc.health / npc.maxHealth);
      label.style.left = `${sPos.x}px`; label.style.top = `${sPos.y}px`;
      label.style.transform = "translate(-50%, -100%)";
      label.style.display = "block";
      activeLabels.add(npc.id);
    }
  }

  for (const [id, mesh] of npcMeshes.entries()) {
    if (!currentNPCs.has(id)) {
      scene.remove(mesh);
      npcMeshes.delete(id);
      targetPositions.delete(id);
    }
  }

  // Render Loot
  const currentLoot = new Set<string>();
  for (const loot of state.loot) {
    currentLoot.add(loot.id);
    let lMesh = lootMeshes.get(loot.id);
    if (!lMesh) {
      lMesh = new THREE.Group();
      lMesh.position.set(loot.position.x, 0, loot.position.y);
      scene.add(lMesh);
      lootMeshes.set(loot.id, lMesh);
      if (loot.glbPath) {
        loadModel(loot.glbPath.replace(/^public\//, ''), (m) => {
          m.traverse(c => { if ((c as THREE.Mesh).isMesh) c.castShadow = c.receiveShadow = true; });
          lMesh!.add(m);
        });
      } else {
        const b = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 4), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
        b.castShadow = true; b.position.y = 1.25; lMesh.add(b);
      }
    }
    lMesh.position.set(loot.position.x, 0, loot.position.y);
    const sPos = projectToScreen(loot.position.x, 6, loot.position.y);
    if (sPos.z < 1 && sPos.x > 0 && sPos.x < window.innerWidth && sPos.y > 0 && sPos.y < window.innerHeight) {
      const label = createWorldLabel(loot.id, loot.item.name, 'loot');
      label.style.left = `${sPos.x}px`; label.style.top = `${sPos.y}px`;
      label.style.transform = "translate(-50%, -100%)";
      label.style.display = "block";
      activeLabels.add(loot.id);
    }
  }

  for (const [id, mesh] of lootMeshes.entries()) {
    if (!currentLoot.has(id)) {
      scene.remove(mesh);
      lootMeshes.delete(id);
    }
  }

  // Cleanup Labels
  document.querySelectorAll('.world-label').forEach(el => {
    if (!activeLabels.has(el.id.replace('label-', ''))) el.remove();
  });
  activeLabels.clear();

  // Tooltip
  const myP = state.players.find((p: any) => p.id === myPlayerId);
  if (myP) {
    const c = getClosestInteractable(myP, state);
    if (c) showTooltip(`Press E to ${c.interactionType === 'loot' ? 'collect ' + c.item.name : 'talk to ' + c.name}`);
    else hideTooltip();
  }
}
