import type { Application, Container } from "pixi.js";
import {
  moveCameraTowardsTarget,
  pullCameraTargetOutsideDeadzone,
  type SmoothCameraState,
} from "./cameraLogic";

type MoveVector = { dx: number; dz: number };
type MoveBridge = (vector: MoveVector) => void;

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
const DEADZONE_RADIUS = 72;

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
      const desired = {
        x: options.app.screen.width * 0.5 - playerRoot.x,
        y: options.app.screen.height * 0.5 - playerRoot.y,
      };
      pullCameraTargetOutsideDeadzone(camera, desired, DEADZONE_RADIUS);
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
}
