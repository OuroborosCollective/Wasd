import { MMORPGClientCore } from "../core/MMORPGClientCore";
import { renderInventory } from "./inventory";
import { renderSkillsPanel } from "./skillsPanel";
import { renderQuestLog } from "./questLog";
import { renderEquipmentPanel } from "./equipmentPanel";

export interface JoystickInput {
  x: number;
  y: number;
  magnitude: number;
  angle: number;
}

export function renderImprovedVirtualJoystick(core: MMORPGClientCore) {
  // Styles
  const style = document.createElement('style');
  style.textContent = `
    .virtual-joystick-container {
      position: fixed;
      bottom: 40px;
      left: 40px;
      width: 120px;
      height: 120px;
      background: radial-gradient(circle at 30% 30%, rgba(100, 150, 255, 0.2), rgba(50, 100, 200, 0.1));
      border: 2px solid rgba(100, 150, 255, 0.3);
      border-radius: 50%;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      touch-action: none;
      user-select: none;
      z-index: 1000;
    }

    .joystick-knob {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 50px;
      height: 50px;
      background: radial-gradient(circle at 30% 30%, rgba(150, 200, 255, 0.9), rgba(80, 130, 200, 0.8));
      border: 2px solid rgba(100, 150, 255, 0.6);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }

    .action-buttons {
      position: fixed;
      bottom: 40px;
      right: 40px;
      display: flex;
      flex-direction: column;
      gap: 15px;
      z-index: 1000;
    }

    .mobile-btn {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
      user-select: none;
      cursor: pointer;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      transition: transform 0.1s;
    }

    .mobile-btn:active {
      transform: scale(0.9);
    }

    .btn-attack { background: rgba(255, 0, 0, 0.6); }
    .btn-interact { background: rgba(0, 0, 255, 0.6); }

    .menu-buttons {
      position: fixed;
      top: 20px;
      right: 20px;
      display: flex;
      gap: 10px;
      z-index: 1000;
    }

    .menu-btn {
      width: 40px;
      height: 40px;
      border-radius: 5px;
      background: rgba(19, 19, 22, 0.8);
      border: 1px solid #E9C349;
      color: #E9C349;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
      user-select: none;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.5);
      transition: transform 0.1s, background 0.2s;
    }
    .menu-btn:active {
      transform: scale(0.9);
      background: rgba(233, 195, 73, 0.3);
    }
  `;
  document.head.appendChild(style);

  // Joystick
  const container = document.createElement("div");
  container.className = "virtual-joystick-container";

  const knob = document.createElement("div");
  knob.className = "joystick-knob";

  container.appendChild(knob);
  document.body.appendChild(container);

  let startX = 0;
  let startY = 0;
  let active = false;

  const handleStart = (clientX: number, clientY: number) => {
    active = true;
    startX = clientX;
    startY = clientY;
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!active) return;
    const dx = clientX - startX;
    const dy = clientY - startY;

    const maxDist = 45;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const limitedDist = Math.min(dist, maxDist);
    const moveX = Math.cos(angle) * limitedDist;
    const moveY = Math.sin(angle) * limitedDist;

    knob.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;

    // Input mapping
    if (dist > 10) {
       // Analog-like movement would be better, but for now we map to WASD
       const threshold = 0.5;
       const nx = moveX / maxDist;
       const ny = moveY / maxDist;

       if (nx > threshold) core.events.emit('input', { type: 'keydown', key: 'd' });
       else if (nx < -threshold) core.events.emit('input', { type: 'keydown', key: 'a' });

       if (ny > threshold) core.events.emit('input', { type: 'keydown', key: 's' });
       else if (ny < -threshold) core.events.emit('input', { type: 'keydown', key: 'w' });
    }
  };

  const handleEnd = () => {
    active = false;
    knob.style.transform = "translate(-50%, -50%)";
  };

  container.addEventListener("touchstart", (e) => handleStart(e.touches[0].clientX, e.touches[0].clientY));
  window.addEventListener("touchmove", (e) => handleMove(e.touches[0].clientX, e.touches[0].clientY), { passive: false });
  window.addEventListener("touchend", handleEnd);

  // Action Buttons
  const btnContainer = document.createElement('div');
  btnContainer.className = 'action-buttons';

  const attackBtn = document.createElement('div');
  attackBtn.className = 'mobile-btn btn-attack';
  attackBtn.innerText = 'ATTACK';
  attackBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    core.attack();
  });
  attackBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    core.attack();
  });

  const interactBtn = document.createElement('div');
  interactBtn.className = 'mobile-btn btn-interact';
  interactBtn.innerText = 'TALK (E)';
  interactBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    core.interact();
  });
  interactBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    core.interact();
  });

  btnContainer.appendChild(interactBtn);
  btnContainer.appendChild(attackBtn);
  document.body.appendChild(btnContainer);

  // Menu Access Buttons
  const menuContainer = document.createElement('div');
  menuContainer.className = 'menu-buttons';

  const menus = [
    { label: 'INV', action: renderInventory },
    { label: 'EQP', action: renderEquipmentPanel },
    { label: 'SKL', action: renderSkillsPanel },
    { label: 'QST', action: renderQuestLog }
  ];

  menus.forEach(menu => {
    const btn = document.createElement('div');
    btn.className = 'menu-btn';
    btn.innerText = menu.label;

    const handler = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      menu.action();
    };

    btn.addEventListener('touchstart', handler);
    btn.addEventListener('mousedown', handler);
    menuContainer.appendChild(btn);
  });

  document.body.appendChild(menuContainer);
}
