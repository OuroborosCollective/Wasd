import type { Application, Container } from "pixi.js";

type MoveVector = { dx: number; dz: number };

type ViewportControllerOptions = {
  app: Application;
  world: Container;
  getPlayerRoot: () => Container | null;
  sendMoveIntent: (vector: MoveVector) => void;
};

declare global {
  interface Window {
    __wasd2dMove?: (vector: MoveVector) => void;
    __wasd2dViewportRuntimeInstalled?: boolean;
  }
}

const INPUT_INTERVAL_MS = 140;
const CAMERA_LERP = 0.14;
const TILE_W = 96;
const TILE_H = 48;
const MAX_RUNTIME_CAMERA_DRIFT = 900;

function isMobileViewport(): boolean {
  return window.matchMedia("(max-width: 920px)").matches;
}

function getCameraFocus(width: number, height: number) {
  if (width <= 520) return { x: width * 0.58, y: height * 0.42 };
  if (width <= 920) return { x: width * 0.55, y: height * 0.45 };
  return { x: width * 0.5, y: height * 0.5 };
}

function clamp(value: number, limit: number) {
  return Math.max(-limit, Math.min(limit, value));
}

function isoDelta(vector: MoveVector) {
  const dx = Number(vector.dx || 0);
  const dz = Number(vector.dz || 0);

  return {
    x: (dx - dz) * (TILE_W / 2),
    y: (dx + dz) * (TILE_H / 2),
  };
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

export function installViewportRuntime() {
  if (window.__wasd2dViewportRuntimeInstalled) return;
  window.__wasd2dViewportRuntimeInstalled = true;

  const keys = new Set<string>();
  let observedMove: typeof window.__wasd2dMove;
  let lastInputAt = 0;
  let cameraX = 0;
  let cameraY = 0;
  let estimatedX = 0;
  let estimatedY = 0;
  let targetX = 0;
  let targetY = 0;

  const resetCamera = () => {
    estimatedX = 0;
    estimatedY = 0;
    targetX = 0;
    targetY = 0;
  };

  function readMoveIntent(): MoveVector {
    let dx = 0;
    let dz = 0;

    if (keys.has("w") || keys.has("arrowup")) dz += 1;
    if (keys.has("s") || keys.has("arrowdown")) dz -= 1;
    if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
    if (keys.has("d") || keys.has("arrowright")) dx += 1;

    return { dx, dz };
  }

  function sampleCamera(vector: MoveVector) {
    if (!isMobileViewport()) return;

    const delta = isoDelta(vector);
    estimatedX = clamp(estimatedX + delta.x, MAX_RUNTIME_CAMERA_DRIFT);
    estimatedY = clamp(estimatedY + delta.y, MAX_RUNTIME_CAMERA_DRIFT);

    const narrow = window.innerWidth <= 520;
    const focusX = window.innerWidth * (narrow ? 0.08 : 0.05);
    const focusY = -window.innerHeight * (narrow ? 0.08 : 0.05);

    targetX = clamp(focusX - estimatedX, MAX_RUNTIME_CAMERA_DRIFT);
    targetY = clamp(focusY - estimatedY, MAX_RUNTIME_CAMERA_DRIFT);
  }

  function sendKeyboardIntent() {
    const move = readMoveIntent();
    if (!move.dx && !move.dz) return;
    if (!window.__wasd2dMove) return;

    const now = Date.now();
    if (now - lastInputAt < INPUT_INTERVAL_MS) return;

    lastInputAt = now;
    window.__wasd2dMove(move);
  }

  function wrapMoveBridge() {
    const current = window.__wasd2dMove;
    if (!current || current === observedMove) return;

    observedMove = current;
    window.__wasd2dMove = (vector: MoveVector) => {
      current(vector);
      sampleCamera(vector);
    };
  }

  function frame() {
    wrapMoveBridge();
    sendKeyboardIntent();

    if (!isMobileViewport()) {
      targetX = 0;
      targetY = 0;
    }

    cameraX += (targetX - cameraX) * CAMERA_LERP;
    cameraY += (targetY - cameraY) * CAMERA_LERP;

    const canvas = document.querySelector<HTMLCanvasElement>(".az-pixi canvas");
    if (canvas) {
      canvas.style.transform = `translate3d(${cameraX.toFixed(2)}px, ${cameraY.toFixed(2)}px, 0)`;
      canvas.style.willChange = "transform";
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", (event) => keys.add(event.key.toLowerCase()));
  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
  window.addEventListener("orientationchange", resetCamera);
  window.addEventListener("pagehide", resetCamera);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) resetCamera();
  });

  requestAnimationFrame(frame);
}
