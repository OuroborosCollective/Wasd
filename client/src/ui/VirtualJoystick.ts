import { MMORPGClientCore } from "../core/MMORPGClientCore";

export function renderVirtualJoystick(core: MMORPGClientCore) {
  const container = document.createElement("div");
  container.id = "virtual-joystick";
  container.style.position = "fixed";
  container.style.bottom = "40px";
  container.style.left = "40px";
  container.style.width = "120px";
  container.style.height = "120px";
  container.style.background = "rgba(255, 255, 255, 0.1)";
  container.style.borderRadius = "50%";
  container.style.border = "2px solid rgba(255, 255, 255, 0.3)";
  container.style.touchAction = "none";
  container.style.zIndex = "1000";

  const stick = document.createElement("div");
  stick.style.position = "absolute";
  stick.style.top = "50%";
  stick.style.left = "50%";
  stick.style.width = "50px";
  stick.style.height = "50px";
  stick.style.background = "rgba(255, 255, 255, 0.5)";
  stick.style.borderRadius = "50%";
  stick.style.transform = "translate(-50%, -50%)";
  stick.style.pointerEvents = "none";

  container.appendChild(stick);
  document.body.appendChild(container);

  let startX = 0;
  let startY = 0;
  let active = false;

  container.addEventListener("touchstart", (e) => {
    active = true;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
  });

  container.addEventListener("touchmove", (e) => {
    if (!active) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    const maxDist = 40;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const limitedDist = Math.min(dist, maxDist);
    const moveX = Math.cos(angle) * limitedDist;
    const moveY = Math.sin(angle) * limitedDist;

    stick.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;

    // Map to WASD for simplicity
    if (dist > 10) {
      if (Math.abs(dx) > Math.abs(dy)) {
        core.events.emit('input', { type: 'keydown', key: dx > 0 ? 'd' : 'a' });
      } else {
        core.events.emit('input', { type: 'keydown', key: dy > 0 ? 's' : 'w' });
      }
    }
  });

  container.addEventListener("touchend", () => {
    active = false;
    stick.style.transform = "translate(-50%, -50%)";
  });

  // Attack Button
  const attackBtn = document.createElement('div');
  attackBtn.id = 'attack-button';
  attackBtn.style.position = 'fixed';
  attackBtn.style.bottom = '40px';
  attackBtn.style.right = '40px';
  attackBtn.style.width = '80px';
  attackBtn.style.height = '80px';
  attackBtn.style.borderRadius = '50%';
  attackBtn.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
  attackBtn.style.border = '2px solid white';
  attackBtn.style.display = 'flex';
  attackBtn.style.alignItems = 'center';
  attackBtn.style.justifyContent = 'center';
  attackBtn.style.color = 'white';
  attackBtn.style.fontWeight = 'bold';
  attackBtn.innerText = 'ATTACK';
  attackBtn.style.userSelect = 'none';
  attackBtn.style.zIndex = '1000';
  attackBtn.style.cursor = 'pointer';
  document.body.appendChild(attackBtn);

  const triggerAttack = () => {
    core.attack();
    attackBtn.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
    setTimeout(() => {
      attackBtn.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
    }, 100);
  };

  attackBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    triggerAttack();
  });

  attackBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    triggerAttack();
  });

  // Talk Button
  const talkBtn = document.createElement('div');
  talkBtn.id = 'talk-button';
  talkBtn.style.position = 'fixed';
  talkBtn.style.bottom = '130px';
  talkBtn.style.right = '40px';
  talkBtn.style.width = '60px';
  talkBtn.style.height = '60px';
  talkBtn.style.borderRadius = '50%';
  talkBtn.style.backgroundColor = 'rgba(0, 0, 255, 0.5)';
  talkBtn.style.border = '2px solid white';
  talkBtn.style.display = 'flex';
  talkBtn.style.alignItems = 'center';
  talkBtn.style.justifyContent = 'center';
  talkBtn.style.color = 'white';
  talkBtn.style.fontWeight = 'bold';
  talkBtn.style.fontSize = '12px';
  talkBtn.innerText = 'TALK (E)';
  talkBtn.style.userSelect = 'none';
  talkBtn.style.zIndex = '1000';
  talkBtn.style.cursor = 'pointer';
  document.body.appendChild(talkBtn);

  const triggerTalk = () => {
    core.interact();
    talkBtn.style.backgroundColor = 'rgba(0, 0, 255, 0.8)';
    setTimeout(() => {
      talkBtn.style.backgroundColor = 'rgba(0, 0, 255, 0.5)';
    }, 100);
  };

  talkBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    triggerTalk();
  });

  talkBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    triggerTalk();
  });
}
