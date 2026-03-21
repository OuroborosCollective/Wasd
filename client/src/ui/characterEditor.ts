/**
 * Character Editor UI
 * Full modular character creation panel shown on first login or via menu.
 * Fetches the manifest from /api/character/manifest and lets the player
 * choose: gender, body, head, skin tone, hair color, eye color, body scale.
 */

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
let previewScene: { bodyUrl: string; headUrl: string } | null = null;

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

        <!-- LEFT: Preview -->
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
            <canvas id="char-preview-canvas" style="width: 100%; height: 100%;"></canvas>
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

          <!-- Body scales -->
          <div>
            <label style="display: block; font-size: 12px; color: #8b949e; margin-bottom: 8px;">
              KÖRPERBAU
            </label>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${renderSlider('height', 'Größe', currentAppearance.heightScale, 0.85, 1.15)}
              ${renderSlider('width', 'Breite', currentAppearance.widthScale, 0.80, 1.20)}
              ${renderSlider('muscularity', 'Muskeln', currentAppearance.muscularityScale, 0.90, 1.10)}
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="
        padding: 20px 28px;
        border-top: 1px solid #21262d;
        display: flex; justify-content: flex-end; gap: 12px;
      ">
        <button id="char-cancel-btn" style="
          padding: 10px 24px; border-radius: 8px; cursor: pointer;
          border: 1px solid #30363d; background: transparent;
          color: #8b949e; font-size: 14px;
        ">Abbrechen</button>
        <button id="char-save-btn" style="
          padding: 10px 28px; border-radius: 8px; cursor: pointer;
          border: none;
          background: linear-gradient(135deg, #f0d080, #c8a840);
          color: #0d1117; font-size: 15px; font-weight: 700;
          box-shadow: 0 4px 16px rgba(240,208,128,0.3);
        ">✨ Abenteuer beginnen!</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Wire up global handlers
  (window as unknown as Record<string, unknown>)._charSetGender = (gender: 'male' | 'female') => {
    currentAppearance.gender = gender;
    currentAppearance.bodyId = gender === 'female' ? 'body_female' : 'body_male';
    // Reset head to first of new gender
    const heads = manifest?.heads[gender] ?? [];
    currentAppearance.headId = heads[0]?.id ?? '';
    renderEditor(playerId);
  };

  (window as unknown as Record<string, unknown>)._charSelectHead = (headId: string) => {
    currentAppearance.headId = headId;
    updateHeadSelector();
    updatePreviewLabel();
  };

  (window as unknown as Record<string, unknown>)._charSelectColor = (type: string, id: string) => {
    if (type === 'skin') currentAppearance.skinToneId = id;
    if (type === 'hair') currentAppearance.hairColorId = id;
    if (type === 'eye') currentAppearance.eyeColorId = id;
    updateColorSelectors();
  };

  (window as unknown as Record<string, unknown>)._charSlider = (type: string, value: string) => {
    const v = parseFloat(value);
    if (type === 'height') currentAppearance.heightScale = v;
    if (type === 'width') currentAppearance.widthScale = v;
    if (type === 'muscularity') currentAppearance.muscularityScale = v;
    const label = document.getElementById(`slider-label-${type}`);
    if (label) label.textContent = v.toFixed(2);
  };

  // Name input
  const nameInput = document.getElementById('char-name-input') as HTMLInputElement;
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      currentAppearance.name = nameInput.value;
    });
    nameInput.addEventListener('focus', () => {
      nameInput.style.borderColor = '#f0d080';
    });
    nameInput.addEventListener('blur', () => {
      nameInput.style.borderColor = '#30363d';
    });
  }

  // Cancel
  document.getElementById('char-cancel-btn')?.addEventListener('click', () => {
    overlay.remove();
  });

  // Save
  document.getElementById('char-save-btn')?.addEventListener('click', async () => {
    const name = (document.getElementById('char-name-input') as HTMLInputElement)?.value?.trim();
    if (!name || name.length < 2) {
      showEditorToast('Bitte gib einen Charakternamen ein (min. 2 Zeichen)!', 'error');
      return;
    }
    currentAppearance.name = name;

    const btn = document.getElementById('char-save-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = '⏳ Wird gespeichert...';

    try {
      const res = await fetch(`/api/character/${playerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentAppearance),
      });
      const data = await res.json();
      if (data.ok) {
        overlay.remove();
        if (onSaveCallback) onSaveCallback(currentAppearance);
        showEditorToast(`Willkommen in Areloria, ${currentAppearance.name}!`, 'success');
      } else {
        showEditorToast('Fehler beim Speichern. Bitte versuche es erneut.', 'error');
        btn.disabled = false;
        btn.textContent = '✨ Abenteuer beginnen!';
      }
    } catch {
      showEditorToast('Netzwerkfehler. Bitte versuche es erneut.', 'error');
      btn.disabled = false;
      btn.textContent = '✨ Abenteuer beginnen!';
    }
  });

  updatePreviewLabel();
  initPreviewCanvas();
}

function renderHeadOptions(): string {
  if (!manifest) return '';
  const heads = manifest.heads[currentAppearance.gender] ?? [];
  return heads.map(head => `
    <button onclick="window._charSelectHead('${head.id}')" style="
      padding: 12px 8px; border-radius: 8px; cursor: pointer;
      border: 2px solid ${currentAppearance.headId === head.id ? '#f0d080' : '#30363d'};
      background: ${currentAppearance.headId === head.id ? 'rgba(240,208,128,0.15)' : '#161b22'};
      color: ${currentAppearance.headId === head.id ? '#f0d080' : '#8b949e'};
      font-size: 13px; transition: all 0.2s; text-align: center;
    ">
      <div style="font-size: 24px; margin-bottom: 4px;">👤</div>
      ${head.name}
    </button>
  `).join('');
}

function renderColorSwatches(
  type: string,
  colors: Array<{ id: string; name: string; color: string }>,
  selectedId: string
): string {
  return colors.map(c => `
    <button
      title="${c.name}"
      onclick="window._charSelectColor('${type}', '${c.id}')"
      style="
        width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
        background: ${c.color};
        border: 3px solid ${selectedId === c.id ? '#f0d080' : 'transparent'};
        box-shadow: ${selectedId === c.id ? '0 0 8px rgba(240,208,128,0.6)' : '0 2px 4px rgba(0,0,0,0.4)'};
        transition: all 0.2s; outline: none;
      "
    ></button>
  `).join('');
}

function renderSlider(type: string, label: string, value: number, min: number, max: number): string {
  return `
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 12px; color: #8b949e; width: 70px;">${label}</span>
      <input
        type="range"
        min="${min}" max="${max}" step="0.01"
        value="${value}"
        oninput="window._charSlider('${type}', this.value)"
        style="flex: 1; accent-color: #f0d080;"
      />
      <span id="slider-label-${type}" style="font-size: 12px; color: #f0d080; width: 36px; text-align: right;">
        ${value.toFixed(2)}
      </span>
    </div>
  `;
}

function updateHeadSelector(): void {
  const container = document.getElementById('head-selector');
  if (container) container.innerHTML = renderHeadOptions();
}

function updateColorSelectors(): void {
  const skinContainer = document.getElementById('skin-selector');
  if (skinContainer && manifest) {
    skinContainer.innerHTML = renderColorSwatches('skin', manifest.skinTones, currentAppearance.skinToneId);
  }
  const hairContainer = document.getElementById('hair-selector');
  if (hairContainer && manifest) {
    hairContainer.innerHTML = renderColorSwatches('hair', manifest.hairColors, currentAppearance.hairColorId);
  }
  const eyeContainer = document.getElementById('eye-selector');
  if (eyeContainer && manifest) {
    eyeContainer.innerHTML = renderColorSwatches('eye', manifest.eyeColors, currentAppearance.eyeColorId);
  }
}

function updatePreviewLabel(): void {
  const label = document.getElementById('char-preview-label');
  if (!label || !manifest) return;
  const heads = manifest.heads[currentAppearance.gender] ?? [];
  const head = heads.find(h => h.id === currentAppearance.headId);
  const skin = manifest.skinTones.find(s => s.id === currentAppearance.skinToneId);
  label.textContent = `${currentAppearance.gender === 'male' ? '♂' : '♀'} ${head?.name ?? ''} · ${skin?.name ?? ''}`;
}

function initPreviewCanvas(): void {
  const canvas = document.getElementById('char-preview-canvas') as HTMLCanvasElement;
  if (!canvas) return;

  // Simple 2D preview using canvas (silhouette with colors)
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = canvas.offsetWidth || 300;
  canvas.height = canvas.offsetHeight || 400;

  drawCharacterSilhouette(ctx, canvas.width, canvas.height);
}

function drawCharacterSilhouette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  if (!manifest) return;

  const skin = manifest.skinTones.find(s => s.id === currentAppearance.skinToneId);
  const hair = manifest.hairColors.find(h => h.id === currentAppearance.hairColorId);
  const eye = manifest.eyeColors.find(e => e.id === currentAppearance.eyeColorId);

  const skinColor = skin?.color ?? '#D4956A';
  const hairColor = hair?.color ?? '#6B3A2A';
  const eyeColor = eye?.color ?? '#6B3A2A';

  ctx.clearRect(0, 0, w, h);

  // Background glow
  const gradient = ctx.createRadialGradient(w/2, h*0.6, 0, w/2, h*0.6, w*0.5);
  gradient.addColorStop(0, 'rgba(240,208,128,0.05)');
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const scale = Math.min(w, h) / 400;
  const heightMod = currentAppearance.heightScale;
  const widthMod = currentAppearance.widthScale;
  const isFemale = currentAppearance.gender === 'female';

  // Shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(cx, h * 0.92, 50 * scale * widthMod, 12 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const bodyTop = h * 0.25;
  const bodyH = h * 0.42 * heightMod;
  const bodyW = (isFemale ? 52 : 62) * scale * widthMod;
  const headR = 38 * scale;
  const headY = bodyTop - headR - 8 * scale;

  // Body (torso)
  ctx.save();
  ctx.fillStyle = '#3a5a8a';
  ctx.beginPath();
  if (isFemale) {
    // Hourglass shape
    ctx.moveTo(cx - bodyW * 0.9, bodyTop);
    ctx.bezierCurveTo(cx - bodyW * 1.1, bodyTop + bodyH * 0.3, cx - bodyW * 0.7, bodyTop + bodyH * 0.5, cx - bodyW * 0.9, bodyTop + bodyH);
    ctx.lineTo(cx + bodyW * 0.9, bodyTop + bodyH);
    ctx.bezierCurveTo(cx + bodyW * 0.7, bodyTop + bodyH * 0.5, cx + bodyW * 1.1, bodyTop + bodyH * 0.3, cx + bodyW * 0.9, bodyTop);
  } else {
    // Broad shoulders
    ctx.moveTo(cx - bodyW * 1.1, bodyTop);
    ctx.lineTo(cx - bodyW * 0.85, bodyTop + bodyH);
    ctx.lineTo(cx + bodyW * 0.85, bodyTop + bodyH);
    ctx.lineTo(cx + bodyW * 1.1, bodyTop);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Legs
  ctx.save();
  ctx.fillStyle = '#2a3a5a';
  const legW = bodyW * 0.42;
  const legTop = bodyTop + bodyH;
  const legH = h * 0.28 * heightMod;
  // Left leg
  ctx.beginPath();
  ctx.roundRect(cx - bodyW * 0.7, legTop, legW, legH, [0, 0, 8, 8]);
  ctx.fill();
  // Right leg
  ctx.beginPath();
  ctx.roundRect(cx + bodyW * 0.28, legTop, legW, legH, [0, 0, 8, 8]);
  ctx.fill();
  ctx.restore();

  // Arms
  ctx.save();
  ctx.fillStyle = skinColor;
  const armW = bodyW * 0.32;
  const armH = bodyH * 0.85;
  // Left arm
  ctx.beginPath();
  ctx.roundRect(cx - bodyW * 1.35, bodyTop + 10 * scale, armW, armH, 8);
  ctx.fill();
  // Right arm
  ctx.beginPath();
  ctx.roundRect(cx + bodyW * 1.05, bodyTop + 10 * scale, armW, armH, 8);
  ctx.fill();
  ctx.restore();

  // Neck
  ctx.save();
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.roundRect(cx - 10 * scale, headY + headR - 4 * scale, 20 * scale, 20 * scale, 4);
  ctx.fill();
  ctx.restore();

  // Head
  ctx.save();
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.ellipse(cx, headY, headR * widthMod, headR, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Hair
  ctx.save();
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  if (isFemale) {
    // Long hair
    ctx.ellipse(cx, headY - headR * 0.3, headR * widthMod * 1.05, headR * 0.55, 0, Math.PI, 0);
    ctx.fill();
    // Side hair
    ctx.beginPath();
    ctx.ellipse(cx - headR * widthMod * 0.9, headY + headR * 0.3, headR * 0.25, headR * 0.7, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + headR * widthMod * 0.9, headY + headR * 0.3, headR * 0.25, headR * 0.7, 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Short hair
    ctx.ellipse(cx, headY - headR * 0.2, headR * widthMod * 1.02, headR * 0.5, 0, Math.PI, 0);
    ctx.fill();
  }
  ctx.restore();

  // Eyes
  ctx.save();
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.ellipse(cx - headR * 0.3, headY, 7 * scale, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + headR * 0.3, headY, 7 * scale, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = eyeColor;
  ctx.beginPath();
  ctx.ellipse(cx - headR * 0.3, headY, 4 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + headR * 0.3, headY, 4 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.ellipse(cx - headR * 0.3, headY, 2 * scale, 2 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + headR * 0.3, headY, 2 * scale, 2 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Eyebrows
  ctx.save();
  ctx.strokeStyle = hairColor;
  ctx.lineWidth = 2.5 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - headR * 0.5, headY - 9 * scale);
  ctx.lineTo(cx - headR * 0.1, headY - 10 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + headR * 0.1, headY - 10 * scale);
  ctx.lineTo(cx + headR * 0.5, headY - 9 * scale);
  ctx.stroke();
  ctx.restore();

  // Mouth
  ctx.save();
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 2 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, headY + headR * 0.35, 8 * scale, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.restore();

  // Armor details
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, bodyTop + 10 * scale);
  ctx.lineTo(cx, bodyTop + bodyH * 0.7);
  ctx.stroke();
  ctx.restore();

  // Glow effect at feet
  const footGlow = ctx.createRadialGradient(cx, legTop + legH, 0, cx, legTop + legH, 40 * scale);
  footGlow.addColorStop(0, 'rgba(240,208,128,0.2)');
  footGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = footGlow;
  ctx.fillRect(cx - 60 * scale, legTop + legH - 20 * scale, 120 * scale, 40 * scale);
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

/** Called when appearance changes to refresh the 2D preview */
export function refreshCharacterPreview(): void {
  const canvas = document.getElementById('char-preview-canvas') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  drawCharacterSilhouette(ctx, canvas.width, canvas.height);
  updatePreviewLabel();
}

/** Get the current appearance (for use in game) */
export function getCurrentAppearance(): CharacterAppearance {
  return { ...currentAppearance };
}

/** Set appearance from saved data */
export function setAppearance(appearance: CharacterAppearance): void {
  currentAppearance = { ...appearance };
}
