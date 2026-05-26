import type { Application, Container } from "pixi.js";

type MoveVector = { dx: number; dz: number };

type ViewportControllerOptions = {
  app: Application;
  world: Container;
  getPlayerRoot: () => Container | null;
  sendMoveIntent: (vector: MoveVector) => void;
};

const INPUT_INTERVAL_MS = 140;
const CAMERA_LERP = 0.14;

function isMobileViewport(): boolean {
  return window.matchMedia("(max-width: 920px)").matches;
}

function getCameraFocus(width: number, height: number) {
  if (width <= 520) return { x: width * 0.58, y: height * 0.42 };
  if (width <= 920) return { x: width * 0.55, y: height * 0.45 };
  return { x: width * 0.5, y: height * 0.5 };
}

export function attachViewportController(options: ViewportControllerOptions) {
  const keys = new Set<string>();
  let raf = 0;
  let destroyed = false;
  let lastInputAt = 0;

  function onKeyDown(event: KeyboardEvent) {
    keys.add(event.key.toLowerCase());
  }

  function onKeyUp(event: KeyboardEvent) {
    keys.delete(event.key.toLowerCase());
  }

  function readMoveIntent(): MoveVector {
    let dx = 0;
    let dz = 0;

    if (keys.has("w") || keys.has("arrowup")) dz += 1;
    if (keys.has("s") || keys.has("arrowdown")) dz -= 1;
    if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
    if (keys.has("d") || keys.has("arrowright")) dx += 1;

    return { dx, dz };
  }

  function sendKeyboardIntent() {
    const vector = readMoveIntent();
    if (!vector.dx && !vector.dz) return;

    const now = Date.now();
    if (now - lastInputAt < INPUT_INTERVAL_MS) return;

    lastInputAt = now;
    options.sendMoveIntent(vector);
  }

  function followAuthoritativePlayer() {
    const playerRoot = options.getPlayerRoot();
    if (!playerRoot) return;

    const focus = getCameraFocus(options.app.screen.width, options.app.screen.height);
    const targetX = focus.x - playerRoot.x;
    const targetY = focus.y - playerRoot.y;
    const speed = isMobileViewport() ? CAMERA_LERP : 0.1;

    options.world.x += (targetX - options.world.x) * speed;
    options.world.y += (targetY - options.world.y) * speed;
  }

  function frame() {
    if (destroyed) return;

    sendKeyboardIntent();
    followAuthoritativePlayer();

    raf = requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      keys.clear();
    },
  };
}
