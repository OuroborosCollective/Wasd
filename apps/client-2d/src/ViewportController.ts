import type { Application, Container } from "pixi.js";
import {
  moveCameraTowardsTarget,
  pullCameraTargetOutsideDeadzone,
  type SmoothCameraState,
} from "./cameraLogic";

type MoveVector = { dx: number; dz: number };
type MoveBridge = (vector: MoveVector) => void;
type WrappedMoveBridge = MoveBridge & { __wasd2dViewportWrapped?: true };

type ViewportControllerOptions = {
  app: Application;
  world: Container;
  getPlayerRoot: () => Container | null;
  sendMoveIntent: (vector: MoveVector) => void;
};

declare global {
  interface Window {
    __wasd2dMove?: MoveBridge;
    __wasd2dViewportRuntimeInstalled?: boolean;
  }
}

const INPUT_INTERVAL_MS = 140;
const TILE_W = 96;
const TILE_H = 48;
const MAX_DRIFT = 900;
const DEADZONE_RADIUS = 72;

function isMobileViewport(): boolean {
  return window.matchMedia("(max-width: 920px)").matches;
}

function clamp(value: number, limit: number) {
  return Math.max(-limit, Math.min(limit, value));
}

function isoDelta(vector: MoveVector) {
  const dx = Number(vector.dx || 0);
  const dz = Number(vector.dz || 0);
  return { x: (dx - dz) * (TILE_W / 2), y: (dx + dz) * (TILE_H / 2) };
}

function readKeyboardIntent(keys: Set<string>): MoveVector {
  let dx = 0;
  let dz = 0;
  if (keys.has("w") || keys.has("arrowup")) dz += 1;
  if (keys.has("s") || keys.has("arrowdown")) dz -= 1;
  if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
  if (keys.has("d") || keys.has("arrowright")) dx += 1;
  return { dx, dz };
}

export function attachViewportController(options: ViewportControllerOptions) {
  const keys = new Set<string>();
  const camera: SmoothCameraState = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let raf = 0;
  let destroyed = false;
  let lastInputAt = 0;
  let lastFrameAt = 0;

  const onKeyDown = (event: KeyboardEvent) => keys.add(event.key.toLowerCase());
  const onKeyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());

  function sendKeyboardIntent() {
    const vector = readKeyboardIntent(keys);
    if (!vector.dx && !vector.dz) return;
    const now = Date.now();
    if (now - lastInputAt < INPUT_INTERVAL_MS) return;
    lastInputAt = now;
    options.sendMoveIntent(vector);
  }

  function frame(now = performance.now()) {
    if (destroyed) return;
    const playerRoot = options.getPlayerRoot();
    const deltaTime = lastFrameAt ? Math.min((now - lastFrameAt) / 16.67, 2) : 1;
    lastFrameAt = now;

    sendKeyboardIntent();
    if (playerRoot) {
      pullCameraTargetOutsideDeadzone(camera, { x: options.app.screen.width * 0.5 - playerRoot.x, y: options.app.screen.height * 0.5 - playerRoot.y }, DEADZONE_RADIUS);
      moveCameraTowardsTarget(camera, deltaTime);
      options.world.x = camera.x;
      options.world.y = camera.y;
    }

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
  const camera: SmoothCameraState = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let observedMove: MoveBridge | undefined;
  let lastInputAt = 0;
  let lastFrameAt = 0;
  let visualX = 0;
  let visualY = 0;

  const resetCamera = () => {
    camera.x = 0;
    camera.y = 0;
    camera.targetX = 0;
    camera.targetY = 0;
    visualX = 0;
    visualY = 0;
  };

  function sampleCamera(vector: MoveVector) {
    if (!isMobileViewport()) return;
    const delta = isoDelta(vector);
    visualX = clamp(visualX + delta.x, MAX_DRIFT);
    visualY = clamp(visualY + delta.y, MAX_DRIFT);
    pullCameraTargetOutsideDeadzone(camera, { x: clamp(-visualX, MAX_DRIFT), y: clamp(-visualY, MAX_DRIFT) }, DEADZONE_RADIUS);
  }

  function sendKeyboardIntent() {
    const move = readKeyboardIntent(keys);
    if (!move.dx && !move.dz) return;
    if (!window.__wasd2dMove) return;
    const now = Date.now();
    if (now - lastInputAt < INPUT_INTERVAL_MS) return;
    lastInputAt = now;
    window.__wasd2dMove(move);
  }

  function wrapMoveBridge() {
    const current = window.__wasd2dMove as WrappedMoveBridge | undefined;
    if (!current || current.__wasd2dViewportWrapped || current === observedMove) return;
    observedMove = current;
    const wrapped: WrappedMoveBridge = (vector: MoveVector) => {
      current(vector);
      sampleCamera(vector);
    };
    wrapped.__wasd2dViewportWrapped = true;
    window.__wasd2dMove = wrapped;
  }

  function frame(now = performance.now()) {
    wrapMoveBridge();
    sendKeyboardIntent();
    const deltaTime = lastFrameAt ? Math.min((now - lastFrameAt) / 16.67, 2) : 1;
    lastFrameAt = now;

    if (!isMobileViewport()) {
      camera.targetX = 0;
      camera.targetY = 0;
    }

    moveCameraTowardsTarget(camera, deltaTime);
    const canvas = document.querySelector<HTMLCanvasElement>(".az-pixi canvas");
    if (canvas) {
      canvas.style.transform = `translate3d(${camera.x.toFixed(2)}px, ${camera.y.toFixed(2)}px, 0)`;
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
