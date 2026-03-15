/**
 * CharacterRenderer
 * Loads modular GLB character parts (body + head) in Three.js,
 * applies skin/hair/eye color tinting, plays animations,
 * and handles equipment attachment.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface CharacterAppearance {
  gender: 'male' | 'female';
  bodyId: string;
  headId: string;
  skinToneId: string;
  hairColorId: string;
  eyeColorId: string;
  heightScale: number;
  widthScale: number;
  muscularityScale: number;
  name: string;
  skinColor?: string;
  hairColor?: string;
  eyeColor?: string;
}

export interface LoadedCharacter {
  group: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  animations: Map<string, THREE.AnimationAction>;
  currentAction: string;
  bodyModel: THREE.Group | null;
  headModel: THREE.Group | null;
  nameLabel: THREE.Sprite | null;
  appearance: CharacterAppearance;
  playAnimation: (name: string, loop?: boolean) => void;
  update: (delta: number) => void;
  setPosition: (x: number, y: number, z: number) => void;
  dispose: () => void;
}

const loader = new GLTFLoader();
const textureCache = new Map<string, THREE.Texture>();
const modelCache = new Map<string, THREE.Group>();

// Animation name mappings (common names in GLB files)
const ANIMATION_ALIASES: Record<string, string[]> = {
  idle:   ['idle', 'Idle', 'IDLE', 'stand', 'Stand', 'T-Pose', 'TPose'],
  walk:   ['walk', 'Walk', 'WALK', 'walking', 'Walking'],
  run:    ['run', 'Run', 'RUN', 'running', 'Running', 'sprint', 'Sprint'],
  attack: ['attack', 'Attack', 'ATTACK', 'slash', 'Slash', 'hit', 'Hit', 'swing'],
  death:  ['death', 'Death', 'DEATH', 'die', 'Die', 'dead', 'Dead'],
  jump:   ['jump', 'Jump', 'JUMP'],
};

function findAnimation(clips: THREE.AnimationClip[], name: string): THREE.AnimationClip | null {
  const aliases = ANIMATION_ALIASES[name] ?? [name];
  for (const alias of aliases) {
    const clip = clips.find(c => c.name === alias || c.name.toLowerCase().includes(alias.toLowerCase()));
    if (clip) return clip;
  }
  return clips[0] ?? null; // fallback to first animation
}

async function loadGLB(url: string): Promise<THREE.Group> {
  if (modelCache.has(url)) {
    return modelCache.get(url)!.clone();
  }
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        modelCache.set(url, gltf.scene);
        resolve(gltf.scene.clone());
      },
      undefined,
      reject
    );
  });
}

async function loadGLBWithAnimations(url: string): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve({ scene: gltf.scene, animations: gltf.animations }),
      undefined,
      reject
    );
  });
}

function applyColorTint(
  model: THREE.Group,
  skinColor: string,
  hairColor: string,
  eyeColor: string
): void {
  const skinHex = new THREE.Color(skinColor);
  const hairHex = new THREE.Color(hairColor);
  const eyeHex = new THREE.Color(eyeColor);

  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mat = child.material;
    if (!mat) return;

    const materials = Array.isArray(mat) ? mat : [mat];
    materials.forEach((m: THREE.Material) => {
      if (!(m instanceof THREE.MeshStandardMaterial)) return;
      const name = (m.name || child.name || '').toLowerCase();

      // Skin detection
      if (
        name.includes('skin') || name.includes('body') || name.includes('face') ||
        name.includes('arm') || name.includes('leg') || name.includes('hand') ||
        name.includes('neck') || name.includes('head_skin') || name.includes('flesh')
      ) {
        m.color.set(skinHex);
      }
      // Hair detection
      else if (
        name.includes('hair') || name.includes('beard') || name.includes('eyebrow') ||
        name.includes('brow') || name.includes('mustache')
      ) {
        m.color.set(hairHex);
      }
      // Eye detection
      else if (
        name.includes('eye') || name.includes('iris') || name.includes('pupil')
      ) {
        m.color.set(eyeHex);
      }
    });
  });
}

function createNameLabel(name: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.roundRect(4, 4, 248, 56, 8);
  ctx.fill();

  // Text
  ctx.fillStyle = '#f0d080';
  ctx.font = 'bold 22px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2, 0.5, 1);
  return sprite;
}

export async function loadCharacter(
  appearance: CharacterAppearance,
  bodyUrl: string,
  headUrl: string,
  scene: THREE.Scene
): Promise<LoadedCharacter> {
  const group = new THREE.Group();

  // Load body with animations
  const { scene: bodyScene, animations: bodyAnims } = await loadGLBWithAnimations(bodyUrl);
  bodyScene.name = 'body';

  // Apply body scale
  bodyScene.scale.set(
    appearance.widthScale,
    appearance.heightScale,
    appearance.widthScale
  );

  // Apply color tinting
  const skinColor = appearance.skinColor ?? '#D4956A';
  const hairColor = appearance.hairColor ?? '#6B3A2A';
  const eyeColor = appearance.eyeColor ?? '#6B3A2A';
  applyColorTint(bodyScene, skinColor, hairColor, eyeColor);

  group.add(bodyScene);

  // Load head
  let headScene: THREE.Group | null = null;
  try {
    headScene = await loadGLB(headUrl);
    headScene.name = 'head';
    applyColorTint(headScene, skinColor, hairColor, eyeColor);

    // Find the neck/head bone to attach the head model
    let headBone: THREE.Bone | null = null;
    bodyScene.traverse((child) => {
      if (child instanceof THREE.Bone) {
        const n = child.name.toLowerCase();
        if (n.includes('head') || n.includes('neck')) {
          if (!headBone || n.includes('head')) headBone = child;
        }
      }
    });

    if (headBone) {
      (headBone as THREE.Bone).add(headScene);
      headScene.position.set(0, 0, 0);
    } else {
      // Fallback: place head on top of body
      const bodyBox = new THREE.Box3().setFromObject(bodyScene);
      headScene.position.y = bodyBox.max.y;
      group.add(headScene);
    }
  } catch (err) {
    console.warn('Could not load head model:', err);
  }

  // Name label
  const nameLabel = createNameLabel(appearance.name);
  const bodyBox = new THREE.Box3().setFromObject(bodyScene);
  nameLabel.position.set(0, bodyBox.max.y + 0.4, 0);
  group.add(nameLabel);

  // Animation mixer
  const mixer = new THREE.AnimationMixer(bodyScene);
  const animationMap = new Map<string, THREE.AnimationAction>();

  // Register all animations
  for (const [animName] of Object.entries(ANIMATION_ALIASES)) {
    const clip = findAnimation(bodyAnims, animName);
    if (clip) {
      const action = mixer.clipAction(clip);
      animationMap.set(animName, action);
    }
  }

  // Start idle animation
  let currentAction = 'idle';
  const idleAction = animationMap.get('idle');
  if (idleAction) {
    idleAction.play();
  }

  scene.add(group);

  const character: LoadedCharacter = {
    group,
    mixer,
    animations: animationMap,
    currentAction,
    bodyModel: bodyScene,
    headModel: headScene,
    nameLabel,
    appearance,

    playAnimation(name: string, loop = true): void {
      const newAction = animationMap.get(name);
      if (!newAction || name === this.currentAction) return;

      const oldAction = animationMap.get(this.currentAction);
      if (oldAction) {
        newAction.reset().fadeIn(0.2);
        oldAction.fadeOut(0.2);
      } else {
        newAction.reset().play();
      }

      newAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      if (!loop) newAction.clampWhenFinished = true;
      newAction.play();
      this.currentAction = name;
    },

    update(delta: number): void {
      mixer.update(delta);
      // Make name label always face camera (billboard)
      if (nameLabel) {
        nameLabel.rotation.copy(new THREE.Euler(0, 0, 0));
      }
    },

    setPosition(x: number, y: number, z: number): void {
      group.position.set(x, y, z);
    },

    dispose(): void {
      scene.remove(group);
      mixer.stopAllAction();
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(m => m.dispose());
        }
      });
    },
  };

  return character;
}

/** Update character appearance (re-apply colors) */
export function updateCharacterAppearance(
  character: LoadedCharacter,
  newAppearance: CharacterAppearance
): void {
  character.appearance = newAppearance;
  const skinColor = newAppearance.skinColor ?? '#D4956A';
  const hairColor = newAppearance.hairColor ?? '#6B3A2A';
  const eyeColor = newAppearance.eyeColor ?? '#6B3A2A';

  if (character.bodyModel) {
    applyColorTint(character.bodyModel, skinColor, hairColor, eyeColor);
  }
  if (character.headModel) {
    applyColorTint(character.headModel, skinColor, hairColor, eyeColor);
  }

  // Update name label
  if (character.nameLabel) {
    character.group.remove(character.nameLabel);
    const newLabel = createNameLabel(newAppearance.name);
    if (character.bodyModel) {
      const box = new THREE.Box3().setFromObject(character.bodyModel);
      newLabel.position.set(0, box.max.y + 0.4, 0);
    }
    character.group.add(newLabel);
    character.nameLabel = newLabel;
  }
}

/** Simple capsule placeholder for players without loaded model */
export function createPlaceholderCharacter(
  name: string,
  color: number,
  scene: THREE.Scene
): THREE.Group {
  const group = new THREE.Group();

  // Body capsule
  const bodyGeo = new THREE.CapsuleGeometry(0.3, 1.0, 4, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.8;
  body.castShadow = true;
  group.add(body);

  // Head sphere
  const headGeo = new THREE.SphereGeometry(0.25, 8, 8);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xFFDFC4 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.7;
  head.castShadow = true;
  group.add(head);

  // Name label
  const label = createNameLabel(name);
  label.position.set(0, 2.2, 0);
  group.add(label);

  scene.add(group);
  return group;
}
