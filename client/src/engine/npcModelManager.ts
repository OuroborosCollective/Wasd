/**
 * NPC Model Manager
 * Maps NPC types/IDs to their GLB model URLs and manages
 * loading, caching and animation for all NPCs in the scene.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface NPCModelConfig {
  url: string;
  scale: number;
  animations: Record<string, string[]>; // logical name -> possible clip names
  color?: number; // fallback color if no model
}

// Map NPC type/id to model config
const NPC_MODEL_MAP: Record<string, NPCModelConfig> = {
  // Named NPC models
  warrior:    { url: '/models/characters/npcs/npc_warrior1.glb', scale: 1.0, animations: { idle: ['idle', 'Idle'], walk: ['walk', 'Walk'], attack: ['attack', 'Attack', 'slash'], death: ['death', 'Death'] } },
  knight:     { url: '/models/characters/npcs/humanknight.glb', scale: 1.0, animations: { idle: ['idle', 'Idle', 'stand'], walk: ['walk', 'Walk'], attack: ['attack', 'Attack'], death: ['death', 'Death'] } },

  // Fallback by NPC type (from npcs.json)
  guard:      { url: '/models/characters/npcs/humanknight.glb', scale: 1.0, animations: { idle: ['idle', 'Idle'], walk: ['walk'], attack: ['attack'], death: ['death'] } },
  merchant:   { url: '/models/characters/npcs/humanknight.glb', scale: 0.95, animations: { idle: ['idle', 'Idle'], walk: ['walk'], attack: ['attack'], death: ['death'] } },
  monster:    { url: '/models/characters/npcs/npc_warrior1.glb', scale: 1.1, animations: { idle: ['idle', 'Idle'], walk: ['walk'], attack: ['attack'], death: ['death'] } },
  wolf:       { url: '/models/characters/npcs/npc_warrior1.glb', scale: 0.7, animations: { idle: ['idle'], walk: ['walk'], attack: ['attack'], death: ['death'] }, color: 0x888888 },
  boar:       { url: '/models/characters/npcs/npc_warrior1.glb', scale: 0.8, animations: { idle: ['idle'], walk: ['walk'], attack: ['attack'], death: ['death'] }, color: 0x8B4513 },
  skeleton:   { url: '/models/characters/npcs/npc_warrior1.glb', scale: 1.0, animations: { idle: ['idle'], walk: ['walk'], attack: ['attack'], death: ['death'] }, color: 0xE8DCC8 },
  bandit:     { url: '/models/characters/npcs/npc_warrior1.glb', scale: 1.0, animations: { idle: ['idle'], walk: ['walk'], attack: ['attack'], death: ['death'] }, color: 0x4a3a2a },
  default:    { url: '/models/characters/npcs/humanknight.glb', scale: 1.0, animations: { idle: ['idle', 'Idle'], walk: ['walk'], attack: ['attack'], death: ['death'] } },
};

interface LoadedNPC {
  group: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  animActions: Map<string, THREE.AnimationAction>;
  currentAnim: string;
  npcId: string;
  nameLabel: THREE.Sprite | null;
  healthBar: THREE.Mesh | null;
  update(delta: number): void;
  playAnim(name: string): void;
  setHealth(current: number, max: number): void;
  dispose(): void;
}

const loader = new GLTFLoader();
const glbCache = new Map<string, { scene: THREE.Group; animations: THREE.AnimationClip[] }>();

async function loadGLBCached(url: string): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> {
  if (glbCache.has(url)) {
    const cached = glbCache.get(url)!;
    return { scene: cached.scene.clone(), animations: cached.animations };
  }
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => {
      glbCache.set(url, { scene: gltf.scene, animations: gltf.animations });
      resolve({ scene: gltf.scene.clone(), animations: gltf.animations });
    }, undefined, reject);
  });
}

function createNPCNameLabel(name: string, type: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 48;
  const ctx = canvas.getContext('2d')!;

  const isHostile = ['wolf', 'boar', 'skeleton', 'bandit', 'monster', 'warrior'].includes(type);
  const bgColor = isHostile ? 'rgba(80,0,0,0.75)' : 'rgba(0,40,80,0.75)';
  const textColor = isHostile ? '#ff6b6b' : '#6bcfff';

  ctx.fillStyle = bgColor;
  ctx.roundRect(2, 2, 252, 44, 6);
  ctx.fill();

  ctx.fillStyle = textColor;
  ctx.font = 'bold 18px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 128, 24);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.8, 0.35, 1);
  return sprite;
}

function createHealthBar(): { bar: THREE.Mesh; bg: THREE.Mesh; container: THREE.Group } {
  const container = new THREE.Group();

  // Background
  const bgGeo = new THREE.PlaneGeometry(1.0, 0.08);
  const bgMat = new THREE.MeshBasicMaterial({ color: 0x330000, side: THREE.DoubleSide });
  const bg = new THREE.Mesh(bgGeo, bgMat);
  container.add(bg);

  // Health fill
  const barGeo = new THREE.PlaneGeometry(1.0, 0.08);
  const barMat = new THREE.MeshBasicMaterial({ color: 0x22cc44, side: THREE.DoubleSide });
  const bar = new THREE.Mesh(barGeo, barMat);
  bar.position.z = 0.001;
  container.add(bar);

  return { bar, bg, container };
}

function findClip(clips: THREE.AnimationClip[], aliases: string[]): THREE.AnimationClip | null {
  for (const alias of aliases) {
    const clip = clips.find(c =>
      c.name === alias || c.name.toLowerCase().includes(alias.toLowerCase())
    );
    if (clip) return clip;
  }
  return clips[0] ?? null;
}

export async function loadNPCModel(
  npcId: string,
  npcType: string,
  npcName: string,
  scene: THREE.Scene
): Promise<LoadedNPC> {
  const config = NPC_MODEL_MAP[npcType] ?? NPC_MODEL_MAP[npcId] ?? NPC_MODEL_MAP.default;
  const group = new THREE.Group();

  let mixer: THREE.AnimationMixer | null = null;
  const animActions = new Map<string, THREE.AnimationAction>();
  let currentAnim = 'idle';

  try {
    const { scene: modelScene, animations } = await loadGLBCached(config.url);
    modelScene.scale.setScalar(config.scale);
    modelScene.castShadow = true;
    modelScene.receiveShadow = true;

    // Apply color tint if specified
    if (config.color) {
      modelScene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(m => {
            if (m instanceof THREE.MeshStandardMaterial) {
              m.color.setHex(config.color!);
            }
          });
        }
      });
    }

    group.add(modelScene);

    // Set up animations
    if (animations.length > 0) {
      mixer = new THREE.AnimationMixer(modelScene);
      for (const [logicalName, aliases] of Object.entries(config.animations)) {
        const clip = findClip(animations, aliases);
        if (clip) {
          const action = mixer.clipAction(clip);
          animActions.set(logicalName, action);
        }
      }
      // Start idle
      const idle = animActions.get('idle');
      if (idle) idle.play();
    }

  } catch (err) {
    console.warn(`NPC model load failed for ${npcType}, using placeholder:`, err);
    // Fallback capsule
    const geo = new THREE.CapsuleGeometry(0.3, 1.0, 4, 8);
    const mat = new THREE.MeshStandardMaterial({ color: config.color ?? 0x888888 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.8;
    mesh.castShadow = true;
    group.add(mesh);
  }

  // Name label
  const nameLabel = createNPCNameLabel(npcName, npcType);
  nameLabel.position.set(0, 2.4 * config.scale, 0);
  group.add(nameLabel);

  // Health bar
  const { bar, bg, container: hpContainer } = createHealthBar();
  hpContainer.position.set(0, 2.8 * config.scale, 0);
  group.add(hpContainer);

  scene.add(group);

  const npc: LoadedNPC = {
    group,
    mixer,
    animActions,
    currentAnim,
    npcId,
    nameLabel,
    healthBar: bar,

    playAnim(name: string): void {
      if (name === this.currentAnim) return;
      const newAction = animActions.get(name);
      if (!newAction) return;
      const oldAction = animActions.get(this.currentAnim);
      if (oldAction) {
        newAction.reset().fadeIn(0.15);
        oldAction.fadeOut(0.15);
      } else {
        newAction.reset().play();
      }
      newAction.play();
      this.currentAnim = name;
    },

    setHealth(current: number, max: number): void {
      const pct = Math.max(0, Math.min(1, current / max));
      bar.scale.x = pct;
      bar.position.x = -(1 - pct) * 0.5;
      const barMat = bar.material as THREE.MeshBasicMaterial;
      if (pct > 0.6) barMat.color.setHex(0x22cc44);
      else if (pct > 0.3) barMat.color.setHex(0xffaa00);
      else barMat.color.setHex(0xcc2222);
    },

    update(delta: number): void {
      if (mixer) mixer.update(delta);
    },

    dispose(): void {
      scene.remove(group);
      if (mixer) mixer.stopAllAction();
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(m => m.dispose());
        }
      });
    },
  };

  return npc;
}

/** Update NPC position and animation based on server state */
export function updateNPCFromState(
  npc: LoadedNPC,
  state: { x: number; y: number; z: number; hp: number; maxHp: number; isMoving?: boolean; isAttacking?: boolean; isDead?: boolean }
): void {
  npc.group.position.set(state.x, state.y ?? 0, state.z);

  if (state.isDead) {
    npc.playAnim('death');
  } else if (state.isAttacking) {
    npc.playAnim('attack');
  } else if (state.isMoving) {
    npc.playAnim('walk');
  } else {
    npc.playAnim('idle');
  }

  npc.setHealth(state.hp ?? 100, state.maxHp ?? 100);
}
