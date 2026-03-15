/**
 * Mobile Controls - Virtual Joystick, Touch Buttons, Pinch Zoom
 * Full Android/iOS/Tablet support for Areloria MMORPG
 */

export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth <= 900
    || ('ontouchstart' in window);
}

interface JoystickState {
  active: boolean;
  dx: number;
  dy: number;
}

const joystickState: JoystickState = { active: false, dx: 0, dy: 0 };

export function getJoystickState(): JoystickState {
  return joystickState;
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const MOBILE_STYLES = `
  #mobile-controls { display: none; }
  @media (max-width: 900px), (pointer: coarse) {
    #mobile-controls { display: block; }
  }
  #joystick-zone {
    position: fixed; bottom: 90px; left: 20px;
    width: 130px; height: 130px; z-index: 1000;
    touch-action: none; user-select: none;
  }
  #joystick-base {
    width: 130px; height: 130px; border-radius: 50%;
    background: rgba(255,255,255,0.08);
    border: 2px solid rgba(255,255,255,0.25);
    position: absolute; top: 0; left: 0;
    backdrop-filter: blur(4px);
  }
  #joystick-thumb {
    width: 52px; height: 52px; border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, rgba(100,180,255,0.9), rgba(50,100,200,0.7));
    border: 2px solid rgba(100,180,255,0.6);
    box-shadow: 0 0 12px rgba(100,180,255,0.4);
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    transition: none;
    pointer-events: none;
  }
  #mobile-action-btns {
    position: fixed; bottom: 90px; right: 20px;
    display: grid; grid-template-columns: 52px 52px;
    grid-template-rows: 52px 52px 52px;
    gap: 8px; z-index: 1000;
    touch-action: none;
  }
  .mob-btn {
    width: 52px; height: 52px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.3);
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(6px);
    color: #fff; font-size: 18px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; touch-action: manipulation;
    transition: transform 0.1s, background 0.1s;
    user-select: none; -webkit-user-select: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  }
  .mob-btn:active { transform: scale(0.88); background: rgba(100,180,255,0.3); }
  .mob-btn-attack { background: rgba(200,40,40,0.5); border-color: rgba(255,80,80,0.5); }
  .mob-btn-attack:active { background: rgba(255,80,80,0.7); }
  .mob-btn-interact { background: rgba(40,160,80,0.5); border-color: rgba(80,220,120,0.5); }
  .mob-btn-interact:active { background: rgba(80,220,120,0.7); }
  .mob-btn-label {
    font-size: 8px; position: absolute; bottom: 2px;
    color: rgba(255,255,255,0.6); pointer-events: none;
  }
  #mobile-menu-btns {
    position: fixed; bottom: 20px; left: 50%;
    transform: translateX(-50%);
    display: flex; gap: 8px; z-index: 1000;
    touch-action: none;
  }
  .mob-menu-btn {
    padding: 8px 14px; border-radius: 20px;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.2);
    color: #c8d8f0; font-size: 11px; font-weight: bold;
    cursor: pointer; touch-action: manipulation;
    white-space: nowrap; user-select: none;
    transition: background 0.1s;
  }
  .mob-menu-btn:active { background: rgba(100,180,255,0.3); }
  #mobile-chat-btn {
    position: fixed; top: 50%; right: 10px;
    transform: translateY(-50%);
    width: 44px; height: 44px; border-radius: 50%;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.2);
    color: #c8d8f0; font-size: 20px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; z-index: 1000;
    touch-action: manipulation;
  }
  #mobile-chat-btn:active { background: rgba(100,180,255,0.3); }
  /* ── SHORTCUT PANEL ──────────────────────────────────────────────────── */
  #mob-shortcut-toggle {
    position: fixed; bottom: 90px; left: 50%;
    transform: translateX(-50%);
    width: 48px; height: 48px; border-radius: 50%;
    background: rgba(20,30,60,0.85); backdrop-filter: blur(8px);
    border: 2px solid rgba(100,180,255,0.4);
    color: #c8d8f0; font-size: 22px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; z-index: 1010;
    touch-action: manipulation;
    box-shadow: 0 2px 12px rgba(0,0,0,0.5);
    transition: background 0.15s;
  }
  #mob-shortcut-toggle:active { background: rgba(100,180,255,0.3); }
  #mob-shortcut-panel {
    position: fixed; bottom: 148px; left: 50%;
    transform: translateX(-50%);
    background: rgba(10,15,35,0.92); backdrop-filter: blur(12px);
    border: 1px solid rgba(100,180,255,0.25);
    border-radius: 16px; padding: 12px 16px;
    z-index: 1009; display: none;
    flex-direction: column; gap: 6px;
    min-width: 220px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.6);
  }
  #mob-shortcut-panel.open { display: flex; }
  .mob-shortcut-row {
    display: flex; gap: 8px; justify-content: center;
  }
  .mob-sc-btn {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    width: 56px; height: 52px;
    border-radius: 10px;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.18);
    color: #c8d8f0; cursor: pointer;
    touch-action: manipulation;
    transition: background 0.1s, transform 0.1s;
    user-select: none;
  }
  .mob-sc-btn:active { background: rgba(100,180,255,0.3); transform: scale(0.92); }
  .mob-sc-icon { font-size: 18px; line-height: 1; }
  .mob-sc-label { font-size: 9px; margin-top: 2px; color: rgba(200,220,255,0.7); }
  .mob-sc-key {
    font-size: 8px; color: rgba(100,180,255,0.8);
    background: rgba(100,180,255,0.12);
    border-radius: 3px; padding: 1px 3px;
    margin-top: 1px;
  }
  .mob-sc-sep {
    height: 1px; background: rgba(255,255,255,0.1);
    margin: 2px 0;
  }
  /* Responsive HUD adjustments for mobile */
  @media (max-width: 900px), (pointer: coarse) {
    #hud-bottom { bottom: 230px !important; }
    #hud-top-left { top: 10px !important; }
    #minimap { top: 10px !important; right: 10px !important; width: 100px !important; height: 100px !important; }
    #chat-panel { bottom: 230px !important; max-height: 120px !important; width: calc(100vw - 40px) !important; left: 20px !important; }
    #dialogue-box { bottom: 240px !important; }
    #action-bar { bottom: 170px !important; }
    .world-label { font-size: 10px !important; }
  }
`;

// ─── INIT ─────────────────────────────────────────────────────────────────────
export function initMobileControls(
  callbacks: {
    onAttack: () => void;
    onInteract: () => void;
    onEquip: () => void;
    onInventory: () => void;
    onQuests: () => void;
    onSkills: () => void;
    onMap: () => void;
    onChat: () => void;
  },
  onPinchZoom: (delta: number) => void,
  onCameraDrag: (dx: number, dy: number) => void
) {
  // Inject styles
  if (!document.getElementById("mobile-styles")) {
    const style = document.createElement("style");
    style.id = "mobile-styles";
    style.textContent = MOBILE_STYLES;
    document.head.appendChild(style);
  }

  const container = document.createElement("div");
  container.id = "mobile-controls";
  container.innerHTML = `
    <!-- Joystick -->
    <div id="joystick-zone">
      <div id="joystick-base"></div>
      <div id="joystick-thumb"></div>
    </div>

    <!-- Action Buttons (right side) -->
    <div id="mobile-action-btns">
      <div class="mob-btn mob-btn-attack" id="mob-attack" style="grid-column:2;grid-row:2;">
        ⚔️
        <span class="mob-btn-label">ATK</span>
      </div>
      <div class="mob-btn mob-btn-interact" id="mob-interact" style="grid-column:1;grid-row:2;">
        💬
        <span class="mob-btn-label">TALK</span>
      </div>
      <div class="mob-btn" id="mob-equip" style="grid-column:2;grid-row:1;">
        🎒
        <span class="mob-btn-label">INV</span>
      </div>
      <div class="mob-btn" id="mob-skills" style="grid-column:1;grid-row:1;">
        ✨
        <span class="mob-btn-label">SKILL</span>
      </div>
      <div class="mob-btn" id="mob-quests" style="grid-column:1;grid-row:3;">
        📜
        <span class="mob-btn-label">QUEST</span>
      </div>
      <div class="mob-btn" id="mob-map" style="grid-column:2;grid-row:3;">
        🗺️
        <span class="mob-btn-label">MAP</span>
      </div>
    </div>

    <!-- Bottom Menu Bar -->
    <div id="mobile-menu-btns">
      <div class="mob-menu-btn" id="mob-menu-inv">🎒 Inv</div>
      <div class="mob-menu-btn" id="mob-menu-quests">📜 Quests</div>
      <div class="mob-menu-btn" id="mob-menu-skills">✨ Skills</div>
      <div class="mob-menu-btn" id="mob-menu-map">🗺️ Map</div>
    </div>

    <!-- Chat Button -->
    <div id="mobile-chat-btn">💬</div>

    <!-- Shortcut Toggle Button (center bottom) -->
    <div id="mob-shortcut-toggle" title="Shortcuts">⌨️</div>

    <!-- Shortcut Panel -->
    <div id="mob-shortcut-panel">
      <!-- Row 1: GM Tools -->
      <div class="mob-shortcut-row">
        <div class="mob-sc-btn" id="mob-sc-gm">
          <span class="mob-sc-icon">🛡️</span>
          <span class="mob-sc-label">GM Panel</span>
          <span class="mob-sc-key">F1</span>
        </div>
        <div class="mob-sc-btn" id="mob-sc-shop">
          <span class="mob-sc-icon">💎</span>
          <span class="mob-sc-label">Shop</span>
          <span class="mob-sc-key">F2</span>
        </div>
        <div class="mob-sc-btn" id="mob-sc-glb">
          <span class="mob-sc-icon">📦</span>
          <span class="mob-sc-label">3D Mgr</span>
          <span class="mob-sc-key">F3</span>
        </div>
        <div class="mob-sc-btn" id="mob-sc-char">
          <span class="mob-sc-icon">👤</span>
          <span class="mob-sc-label">Charakter</span>
          <span class="mob-sc-key">F4</span>
        </div>
      </div>
      <div class="mob-sc-sep"></div>
      <!-- Row 2: World Actions -->
      <div class="mob-shortcut-row">
        <div class="mob-sc-btn" id="mob-sc-land">
          <span class="mob-sc-icon">🏡</span>
          <span class="mob-sc-label">Land</span>
          <span class="mob-sc-key">L</span>
        </div>
        <div class="mob-sc-btn" id="mob-sc-craft">
          <span class="mob-sc-icon">⚒️</span>
          <span class="mob-sc-label">Crafting</span>
          <span class="mob-sc-key">C</span>
        </div>
        <div class="mob-sc-btn" id="mob-sc-guild">
          <span class="mob-sc-icon">⚜️</span>
          <span class="mob-sc-label">Gilde</span>
          <span class="mob-sc-key">G</span>
        </div>
        <div class="mob-sc-btn" id="mob-sc-map2">
          <span class="mob-sc-icon">🗺️</span>
          <span class="mob-sc-label">Weltkarte</span>
          <span class="mob-sc-key">M</span>
        </div>
      </div>
      <div class="mob-sc-sep"></div>
      <!-- Row 3: Combat -->
      <div class="mob-shortcut-row">
        <div class="mob-sc-btn" id="mob-sc-inv2">
          <span class="mob-sc-icon">🎒</span>
          <span class="mob-sc-label">Inventar</span>
          <span class="mob-sc-key">I</span>
        </div>
        <div class="mob-sc-btn" id="mob-sc-skills2">
          <span class="mob-sc-icon">✨</span>
          <span class="mob-sc-label">Skills</span>
          <span class="mob-sc-key">K</span>
        </div>
        <div class="mob-sc-btn" id="mob-sc-quests2">
          <span class="mob-sc-icon">📜</span>
          <span class="mob-sc-label">Quests</span>
          <span class="mob-sc-key">Q</span>
        </div>
        <div class="mob-sc-btn" id="mob-sc-chat2">
          <span class="mob-sc-icon">💬</span>
          <span class="mob-sc-label">Chat</span>
          <span class="mob-sc-key">T</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  // ── JOYSTICK LOGIC ──────────────────────────────────────────────────────────
  const joystickZone = document.getElementById("joystick-zone")!;
  const joystickThumb = document.getElementById("joystick-thumb")!;
  const JOYSTICK_RADIUS = 65;
  let joystickTouchId: number | null = null;
  let joystickOriginX = 0;
  let joystickOriginY = 0;

  joystickZone.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    joystickTouchId = touch.identifier;
    const rect = joystickZone.getBoundingClientRect();
    joystickOriginX = rect.left + rect.width / 2;
    joystickOriginY = rect.top + rect.height / 2;
    joystickState.active = true;
  }, { passive: false });

  joystickZone.addEventListener("touchmove", (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier !== joystickTouchId) continue;
      const rawDx = touch.clientX - joystickOriginX;
      const rawDy = touch.clientY - joystickOriginY;
      const dist = Math.hypot(rawDx, rawDy);
      const clampedDist = Math.min(dist, JOYSTICK_RADIUS);
      const angle = Math.atan2(rawDy, rawDx);
      const clampedX = Math.cos(angle) * clampedDist;
      const clampedY = Math.sin(angle) * clampedDist;
      joystickThumb.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;
      joystickState.dx = clampedX / JOYSTICK_RADIUS;
      joystickState.dy = clampedY / JOYSTICK_RADIUS;
    }
  }, { passive: false });

  const resetJoystick = () => {
    joystickTouchId = null;
    joystickState.active = false;
    joystickState.dx = 0;
    joystickState.dy = 0;
    joystickThumb.style.transform = "translate(-50%, -50%)";
  };

  joystickZone.addEventListener("touchend", resetJoystick, { passive: false });
  joystickZone.addEventListener("touchcancel", resetJoystick, { passive: false });

  // ── ACTION BUTTONS ──────────────────────────────────────────────────────────
  const addTouchBtn = (id: string, cb: () => void) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("touchstart", (e) => { e.preventDefault(); e.stopPropagation(); cb(); }, { passive: false });
    el.addEventListener("click", cb);
  };

  addTouchBtn("mob-attack", callbacks.onAttack);
  addTouchBtn("mob-interact", callbacks.onInteract);
  addTouchBtn("mob-equip", callbacks.onInventory);
  addTouchBtn("mob-skills", callbacks.onSkills);
  addTouchBtn("mob-quests", callbacks.onQuests);
  addTouchBtn("mob-map", callbacks.onMap);
  addTouchBtn("mob-menu-inv", callbacks.onInventory);
  addTouchBtn("mob-menu-quests", callbacks.onQuests);
  addTouchBtn("mob-menu-skills", callbacks.onSkills);
  addTouchBtn("mob-menu-map", callbacks.onMap);
  addTouchBtn("mobile-chat-btn", callbacks.onChat);

  // ── SHORTCUT PANEL TOGGLE ────────────────────────────────────────────────────
  const shortcutToggle = document.getElementById("mob-shortcut-toggle")!;
  const shortcutPanel = document.getElementById("mob-shortcut-panel")!;

  shortcutToggle.addEventListener("touchstart", (e) => {
    e.preventDefault();
    shortcutPanel.classList.toggle("open");
  }, { passive: false });
  shortcutToggle.addEventListener("click", () => {
    shortcutPanel.classList.toggle("open");
  });

  // Close panel when any shortcut button is pressed
  const closeShortcuts = () => shortcutPanel.classList.remove("open");

  // Helper: fire keyboard event to simulate key press
  const fireKey = (key: string) => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    closeShortcuts();
  };

  // Shortcut buttons – fire the same keyboard events as desktop shortcuts
  const scBtns: Array<[string, string]> = [
    ["mob-sc-gm",      "F1"],
    ["mob-sc-shop",    "F2"],
    ["mob-sc-glb",     "F3"],
    ["mob-sc-char",    "F4"],
    ["mob-sc-land",    "l"],
    ["mob-sc-craft",   "c"],
    ["mob-sc-guild",   "g"],
    ["mob-sc-map2",    "m"],
    ["mob-sc-inv2",    "i"],
    ["mob-sc-skills2", "k"],
    ["mob-sc-quests2", "q"],
    ["mob-sc-chat2",   "t"],
  ];

  scBtns.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("touchstart", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fireKey(key);
    }, { passive: false });
    el.addEventListener("click", () => fireKey(key));
  });

  // ── CAMERA DRAG (two-finger or right-area single finger) ────────────────────
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement || document.querySelector("canvas");
  if (canvas) {
    let cameraTouchId: number | null = null;
    let lastCamX = 0;
    let lastCamY = 0;
    let pinchDist = 0;
    let pinchActive = false;


    const isPointInRect = (x: number, y: number, rect?: DOMRect) => {
      if (!rect) return false;
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };

    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();

      if (e.touches.length === 2) {
        // Pinch zoom
        pinchActive = true;
        cameraTouchId = null;
        const t1 = e.touches[0], t2 = e.touches[1];
        pinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        return;
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        // Only start camera drag if touch is NOT in joystick zone or action buttons
        const joystickRect = joystickZone.getBoundingClientRect();
        const actionRect = document.getElementById("mobile-action-btns")?.getBoundingClientRect();

        const inJoystick = isPointInRect(touch.clientX, touch.clientY, joystickRect);
        const inActions = isPointInRect(touch.clientX, touch.clientY, actionRect);

        if (!inJoystick && !inActions) {
          cameraTouchId = touch.identifier;
          lastCamX = touch.clientX;
          lastCamY = touch.clientY;
        }
      }
    }, { passive: false });

    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();

      if (pinchActive && e.touches.length === 2) {
        const t1 = e.touches[0], t2 = e.touches[1];
        const newDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const delta = (pinchDist - newDist) * 0.05;
        onPinchZoom(delta);
        pinchDist = newDist;
        return;
      }

      if (cameraTouchId !== null) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier !== cameraTouchId) continue;
          const dx = touch.clientX - lastCamX;
          const dy = touch.clientY - lastCamY;
          onCameraDrag(dx, dy);
          lastCamX = touch.clientX;
          lastCamY = touch.clientY;
        }
      }
    }, { passive: false });

    canvas.addEventListener("touchend", (e) => {
      if (e.touches.length < 2) pinchActive = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === cameraTouchId) {
          cameraTouchId = null;
        }
      }
    }, { passive: false });
  }
}
