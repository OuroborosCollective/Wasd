/**
 * Character Editor UI
 * Full modular character creation panel shown on first login or via menu.
 * Fetches the manifest from /api/character/manifest and lets the player
 * choose: gender, body, head, skin tone, hair color, eye color, body scale.
 * 
 * NOW WITH 3D GLB PREVIEW using Three.js!
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface CharacterManifest {
  bodies: Record<string, { id: string; name: string; file: string }>;
  heads: Record<string, Array<{ id: string; name: string; file: string }>>;
  skinTones: Array<{ id: string; name: string; color: string }>;
  hairColors: Array<{ id: string; name: string; color: string }>;
  eyeColors: Array<{ id: string; name: string; color: string }>;
  bodyScales: Record<string, { min: number; max: number; default: number; label: string }>;
}

interface CharacterAppearance {
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
}

let manifest: CharacterManifest | null = null;
let currentAppearance: CharacterAppearance = {
  gender: 'male',
  bodyId: 'body_male',
  headId: 'head_male_1',
  skinToneId: 'skin_medium',
  hairColorId: 'hair_brown',
  eyeColorId: 'eye_brown',
  heightScale: 1.0,
  widthScale: 1.0,
  muscularityScale: 1.0,
  name: '',
};

let onSaveCallback: ((appearance: CharacterAppearance) => void) | null = null;
let previewScene: THREE.Scene | null = null;
let previewCamera: THREE.Camera | null = null;
let previewRenderer: THREE.WebGLRenderer | null = null;
let previewCharacterGroup: THREE.Group | null = null;
let previewAnimationId: number | null = null;

const gltfLoader = new GLTFLoader();
const modelCache = new Map<string, THREE.Group>();

export async function openCharacterEditor(
  playerId: string,
  existingAppearance: CharacterAppearance | null,
  onSave: (appearance: CharacterAppearance) => void
): Promise<void> {
  onSaveCallback = onSave;
  // Load manifest if not already loaded
  if (!manifest) {
    try {
      const res = await fetch('/api/character/manifest');
      manifest = await res.json() as CharacterManifest;
    } catch {
      console.error('Failed to load character manifest');
      return;
    }
  }
  if (existingAppearance) {
    currentAppearance = { ...existingAppearance };
  }
  renderEditor(playerId);
}

function renderEditor(playerId: string): void {
  // Remove existing editor
  document.getElementById('character-editor')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'character-editor';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.92);
    display: flex; align-items: center; justify-content: center;
    z-index: 10000; font-family: 'Segoe UI', sans-serif;
  `;
  overlay.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
      border: 1px solid #30363d;
      border-radius: 16px;
      width: min(960px, 98vw);
      max-height: 95vh;
      overflow-y: auto;
      box-shadow: 0 24px 64px rgba(0,0,0,0.8);
      color: #e6edf3;
    ">
      <!-- Header -->
      <div style="
        background: linear-gradient(90deg, #1f3a5f, #2d1b69);
        padding: 20px 28px;
        border-radius: 16px 16px 0 0;
        display: flex; align-items: center; gap: 16px;
      ">
        <div style="font-size: 32px;">⚔️</div>
        <div>
          <h2 style="margin: 0; font-size: 22px; color: #f0d080;">Charakter erstellen</h2>
          <p style="margin: 4px 0 0; font-size: 13px; color: #8b949e;">
            Gestalte deinen Helden in Areloria
          </p>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0; min-height: 500px;">
        <!-- LEFT: 3D Preview -->
        <div style="
          padding: 24px;
          border-right: 1px solid #21262d;
          display: flex; flex-direction: column; align-items: center; gap: 16px;
        ">
          <div id="char-preview-container" style="
            width: 100%; aspect-ratio: 3/4; max-height: 360px;
            background: radial-gradient(ellipse at center, #1a2a3a 0%, #0d1117 100%);
            border: 1px solid #30363d;
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            position: relative; overflow: hidden;
          ">
            <div id="char-preview-label" style="
              position: absolute; bottom: 12px; left: 0; right: 0;
              text-align: center; font-size: 14px; color: #f0d080;
              text-shadow: 0 0 8px rgba(240,208,128,0.5);
            "></div>
          </div>
          <!-- Name input -->
          <div style="width: 100%;">
            <label style="display: block; font-size: 12px; color: #8b949e; margin-bottom: 6px;">
              CHARAKTERNAME
            </label>
            <input
              id="char-name-input"
              type="text"
              maxlength="24"
              placeholder="Dein Heldenname..."
              value="${currentAppearance.name}"
              style="
                width: 100%; box-sizing: border-box;
                background: #0d1117; border: 1px solid #30363d;
                color: #e6edf3; padding: 10px 14px;
                border-radius: 8px; font-size: 15px;
                outline: none; transition: border-color 0.2s;
              "
            />
          </div>
          <!-- Gender toggle -->
          <div style="width: 100%;">
            <label style="display: block; font-size: 12px; color: #8b949e; margin-bottom: 8px;">
              GESCHLECHT
            </label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <button id="btn-gender-male" onclick="window._charSetGender('male')" style="
                padding: 10px; border-radius: 8px; cursor: pointer;
                border: 2px solid ${currentAppearance.gender === 'male' ? '#f0d080' : '#30363d'};
                background: ${currentAppearance.gender === 'male' ? 'rgba(240,208,128,0.15)' : '#161b22'};
                color: ${currentAppearance.gender === 'male' ? '#f0d080' : '#8b949e'};
                font-size: 14px; transition: all 0.2s;
              ">⚔️ Männlich</button>
              <button id="btn-gender-female" onclick="window._charSetGender('female')" style="
                padding: 10px; border-radius: 8px; cursor: pointer;
                border: 2px solid ${currentAppearance.gender === 'female' ? '#f0d080' : '#30363d'};
                background: ${currentAppearance.gender === 'female' ? 'rgba(240,208,128,0.15)' : '#161b22'};
                color: ${currentAppearance.gender === 'female' ? '#f0d080' : '#8b949e'};
                font-size: 14px; transition: all 0.2s;
              ">🌙 Weiblich</button>
            </div>
          </div>
        </div>
        <!-- RIGHT: Customization -->
        <div style="padding: 24px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto;">
          <!-- Head selection -->
          <div>
            <label style="display: block; font-size: 12px; color: #8b949e; margin-bottom: 8px;">
              GESICHT / KOPF
            </label>
            <div id="head-selector" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              ${renderHeadOptions()}
            </div>
          </div>
          <!-- Skin tone -->
          <div>
            <label style="display: block; font-size: 12px; color: #8b949e; margin-bottom: 8px;">
              HAUTFARBE
            </label>
            <div id="skin-selector" style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${renderColorSwatches('skin', manifest?.skinTones ?? [], currentAppearance.skinToneId)}
            </div>
          </div>
          <!-- Hair color -->
          <div>
            <label style="display: block; font-size: 12px; color: #8b949e; margin-bottom: 8px;">
              HAARFARBE
            </label>
            <div id="hair-selector" style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${renderColorSwatches('hair', manifest?.hairColors ?? [], currentAppearance.hairColorId)}
            </div>
          </div>
          <!-- Eye color -->
          <div>
            <label style="display: block; font-size: 12px; color: #8b949e; margin-bottom: 8px;">
              AUGENFARBE
            </label>
            <div id="eye-selector" style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${renderColorSwatches('eye', manifest?.eyeColors ?? [], currentAppearance.eyeColorId)}
            </div>
          </div>
          <!-- Sliders -->
          <div>
            ${renderSlider('height', 'Größe', currentAppearance.heightScale, 0.85, 1.15)}
          </div>
          <div>
            ${renderSlider('width', 'Breite', currentAppearance.widthScale, 0.80, 1.20)}
          </div>
          <div>
            ${renderSlider('muscularity', 'Muskeln', currentAppearance.muscularityScale, 0.90, 1.10)}
          </div>
          <!-- Action buttons -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px;">
            <button id="btn-char-cancel" onclick="window._charCancel()" style="
              padding: 12px; border-radius: 8px; cursor: pointer;
              border: 1px solid #30363d; background: #161b22;
              color: #8b949e; font-size: 14px; font-weight: bold;
              transition: all 0.2s;
            ">Abbrechen</button>
            <button id="btn-char-save" onclick="window._charSave()" style="
              padding: 12px; border-radius: 8px; cursor: pointer;
              border: 1px solid #f0d080; background: rgba(240,208,128,0.15);
              color: #f0d080; font-size: 14px; font-weight: bold;
              transition: all 0.2s;
            ">✨ Speichern</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  // Attach event handlers to window
  (window as any)._charSetGender = setGender;
  (window as any)._charSetHead = setHead;
  (window as any)._charSetColor = setColor;
  (window as any)._charSetScale = setScale;
  (window as any)._charCancel = cancelEditor;
  (window as any)._charSave = saveCharacter;
  // Initialize 3D preview
  setTimeout(() => {
    initPreview3D();
  }, 100);
}

function renderHeadOptions(): string {
  const heads = manifest?.heads[currentAppearance.gender] ?? [];
  return heads.map(head => `
    <button onclick="window._charSetHead('${head.id}')" style="
      padding: 10px; border-radius: 8px; cursor: pointer;
      border: 2px solid ${currentAppearance.headId === head.id ? '#f0d080' : '#30363d'};
      background: ${currentAppearance.headId === head.id ? 'rgba(240,208,128,0.15)' : '#161b22'};
      color: ${currentAppearance.headId === head.id ? '#f0d080' : '#8b949e'};
      font-size: 13px; transition: all 0.2s;
    ">${head.name}</button>
  `).join('');
}

function renderColorSwatches(type: string, colors: Array<{ id: string; name: string; color: string }>, selected: string): string {
  return colors.map(c => `
    <button onclick="window._charSetColor('${type}', '${c.id}')" title="${c.name}" style="
      width: 32px; height: 32px; border-radius: 6px; cursor: pointer;
      border: 2px solid ${selected === c.id ? '#f0d080' : '#30363d'};
      background: ${c.color}; transition: all 0.2s;
      box-shadow: ${selected === c.id ? '0 0 12px rgba(240,208,128,0.6)' : 'none'};
    "></button>
  `).join('');
}

function renderSlider(type: string, label: string, value: number, min: number, max: number): string {
  return `
    <div>
      <label style="display: block; font-size: 12px; color: #8b949e; margin-bottom: 6px;">
        ${label}: <span id="slider-${type}-value" style="color: #f0d080;">${(value * 100).toFixed(0)}%</span>
      </label>
      <input type="range" id="slider-${type}" min="${min}" max="${max}" step="0.01" value="${value}"
        onchange="window._charSetScale('${type}', this.value)"
        oninput="document.getElementById('slider-${type}-value').textContent = (this.value * 100).toFixed(0) + '%'"
        style="width: 100%; cursor: pointer;"
      />
    </div>
  `;
}

function setGender(gender: 'male' | 'female'): void {
  currentAppearance.gender = gender;
  currentAppearance.bodyId = gender === 'female' ? 'body_female' : 'body_male';
  const heads = manifest?.heads[gender] ?? [];
  if (heads.length > 0) {
    currentAppearance.headId = heads[0].id;
  }
  const container = document.getElementById('head-selector');
  if (container) container.innerHTML = renderHeadOptions();
  updatePreview3D();
}

function setHead(headId: string): void {
  currentAppearance.headId = headId;
  const container = document.getElementById('head-selector');
  if (container) container.innerHTML = renderHeadOptions();
  updatePreview3D();
}

function setColor(type: string, colorId: string): void {
  if (type === 'skin') {
    currentAppearance.skinToneId = colorId;
    const container = document.getElementById('skin-selector');
    if (container) container.innerHTML = renderColorSwatches('skin', manifest?.skinTones ?? [], colorId);
  } else if (type === 'hair') {
    currentAppearance.hairColorId = colorId;
    const container = document.getElementById('hair-selector');
    if (container) container.innerHTML = renderColorSwatches('hair', manifest?.hairColors ?? [], colorId);
  } else if (type === 'eye') {
    currentAppearance.eyeColorId = colorId;
    const container = document.getElementById('eye-selector');
    if (container) container.innerHTML = renderColorSwatches('eye', manifest?.eyeColors ?? [], colorId);
  }
  updatePreview3D();
}

function setScale(type: string, value: string): void {
  const num = parseFloat(value);
  if (type === 'height') currentAppearance.heightScale = num;
  else if (type === 'width') currentAppearance.widthScale = num;
  else if (type === 'muscularity') currentAppearance.muscularityScale = num;
  updatePreview3D();
}

function cancelEditor(): void {
  if (previewAnimationId !== null) cancelAnimationFrame(previewAnimationId);
  if (previewRenderer) previewRenderer.dispose();
  document.getElementById('character-editor')?.remove();
}

function saveCharacter(): void {
  const nameInput = document.getElementById('char-name-input') as HTMLInputElement;
  if (nameInput) {
    currentAppearance.name = nameInput.value.trim() || 'Adventurer';
  }
  if (!currentAppearance.name) {
    showEditorToast('Bitte gib einen Namen ein!', 'error');
    return;
  }
  // Send to server
  fetch(`/api/character/${(window as any).currentPlayerId || 'player'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(currentAppearance),
  })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        showEditorToast('✨ Charakter gespeichert!', 'success');
        setTimeout(() => {
          cancelEditor();
          if (onSaveCallback) onSaveCallback(currentAppearance);
        }, 500);
      } else {
        showEditorToast('Fehler beim Speichern', 'error');
      }
    })
    .catch(err => {
      console.error('Save error:', err);
      showEditorToast('Verbindungsfehler', 'error');
    });
}

async function loadGLBModel(url: string): Promise<THREE.Group> {
  if (modelCache.has(url)) {
    return modelCache.get(url)!.clone();
  }
  return new Promise((resolve, reject) => {
    gltfLoader.load(
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

function initPreview3D(): void {
  const container = document.getElementById('char-preview-container');
  if (!container) return;
  
  const width = container.clientWidth || 300;
  const height = container.clientHeight || 400;
  
  // Create Three.js scene
  previewScene = new THREE.Scene();
  previewScene.background = new THREE.Color(0x0d1117);
  
  // Camera
  previewCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  previewCamera.position.set(0, 1, 2.5);
  previewCamera.lookAt(0, 1, 0);
  
  // Renderer
  previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  previewRenderer.setSize(width, height);
  previewRenderer.setPixelRatio(window.devicePixelRatio);
  
  // Clear existing canvas
  const existingCanvas = container.querySelector('canvas');
  if (existingCanvas) container.removeChild(existingCanvas);
  container.appendChild(previewRenderer.domElement);
  
  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffeedd, 0.8);
  previewScene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xfff5e0, 1.0);
  directionalLight.position.set(5, 10, 7);
  previewScene.add(directionalLight);
  
  // Load and display character
  updatePreview3D();
  
  // Animation loop
  function animate() {
    previewAnimationId = requestAnimationFrame(animate);
    if (previewRenderer && previewScene && previewCamera) {
      previewRenderer.render(previewScene, previewCamera);
    }
  }
  animate();
}

async function updatePreview3D(): Promise<void> {
  if (!previewScene || !manifest) return;
  
  // Remove old character
  if (previewCharacterGroup) {
    previewScene.remove(previewCharacterGroup);
  }
  
  previewCharacterGroup = new THREE.Group();
  previewCharacterGroup.position.y = 0;
  
  try {
    // Load body model
    const bodyData = manifest.bodies[currentAppearance.gender];
    if (bodyData) {
      const bodyModel = await loadGLBModel(bodyData.file);
      bodyModel.scale.set(
        currentAppearance.widthScale,
        currentAppearance.heightScale,
        currentAppearance.widthScale
      );
      previewCharacterGroup.add(bodyModel);
    }
    
    // Load head model
    const heads = manifest.heads[currentAppearance.gender] || [];
    const headData = heads.find(h => h.id === currentAppearance.headId);
    if (headData) {
      const headModel = await loadGLBModel(headData.file);
      // Correct head scale - typical for these models is 1.0 if they are already scaled, 
      // but let's use a safe value and position it relative to the body height.
      const headScale = 0.8; 
      headModel.scale.set(headScale, headScale, headScale);
      
      // Position head on top of body (approx 1.65m base * heightScale)
      headModel.position.y = 1.65 * currentAppearance.heightScale;
      previewCharacterGroup.add(headModel);
    }
    
    // Apply color tints
    const skinTone = manifest.skinTones.find(s => s.id === currentAppearance.skinToneId);
    const hairColor = manifest.hairColors.find(h => h.id === currentAppearance.hairColorId);
    const eyeColor = manifest.eyeColors.find(e => e.id === currentAppearance.eyeColorId);
    
    if (skinTone || hairColor || eyeColor) {
      applyColorTints(previewCharacterGroup, skinTone?.color, hairColor?.color, eyeColor?.color);
    }
    
  } catch (err) {
    console.warn('Error loading character model:', err);
  }
  
  previewScene.add(previewCharacterGroup);
  
  // Update label
  const label = document.getElementById('char-preview-label');
  if (label) {
    const heads = manifest.heads[currentAppearance.gender] ?? [];
    const head = heads.find(h => h.id === currentAppearance.headId);
    const skin = manifest.skinTones.find(s => s.id === currentAppearance.skinToneId);
    label.textContent = `${currentAppearance.gender === 'male' ? '♂' : '♀'} ${head?.name ?? ''} · ${skin?.name ?? ''}`;
  }
}

function applyColorTints(model: THREE.Group, skinColor?: string, hairColor?: string, eyeColor?: string): void {
  const skinHex = skinColor ? new THREE.Color(skinColor) : new THREE.Color(0xD4956A);
  const hairHex = hairColor ? new THREE.Color(hairColor) : new THREE.Color(0x6B3A2A);
  const eyeHex = eyeColor ? new THREE.Color(eyeColor) : new THREE.Color(0x6B3A2A);
  
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mat = child.material;
    if (!mat) return;
    const materials = Array.isArray(mat) ? mat : [mat];
    materials.forEach((m: THREE.Material) => {
      if (!(m instanceof THREE.MeshStandardMaterial)) return;
      const name = (m.name || child.name || '').toLowerCase();
      
      if (name.includes('skin') || name.includes('body') || name.includes('face') ||
          name.includes('arm') || name.includes('leg') || name.includes('hand') ||
          name.includes('neck') || name.includes('head_skin') || name.includes('flesh')) {
        m.color.set(skinHex);
      } else if (name.includes('hair') || name.includes('beard') || name.includes('eyebrow') ||
                 name.includes('brow') || name.includes('mustache')) {
        m.color.set(hairHex);
      } else if (name.includes('eye') || name.includes('iris') || name.includes('pupil')) {
        m.color.set(eyeHex);
      }
    });
  });
}

function showEditorToast(message: string, type: 'success' | 'error'): void {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: ${type === 'success' ? '#1a4a2a' : '#4a1a1a'};
    border: 1px solid ${type === 'success' ? '#2ea043' : '#f85149'};
    color: ${type === 'success' ? '#3fb950' : '#ff7b72'};
    padding: 12px 24px; border-radius: 8px;
    font-size: 14px; z-index: 20000;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    animation: fadeIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

export function getCurrentAppearance(): CharacterAppearance {
  return { ...currentAppearance };
}

export function setAppearance(appearance: CharacterAppearance): void {
  currentAppearance = { ...appearance };
}
