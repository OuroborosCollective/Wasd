export type CameraPoint = {
  x: number;
  y: number;
};

export type SmoothCameraState = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
};

const DEFAULT_RADIUS = 72;
const DEFAULT_BLEND = 0.12;
const MAX_DELTA = 2;

export function pullCameraTargetOutsideDeadzone(
  state: SmoothCameraState,
  desired: CameraPoint,
  radius = DEFAULT_RADIUS,
) {
  const driftX = desired.x - state.targetX;
  const driftY = desired.y - state.targetY;
  const drift = Math.hypot(driftX, driftY);

  if (drift <= radius) return;

  const pull = (drift - radius) / drift;
  state.targetX += driftX * pull;
  state.targetY += driftY * pull;
}

export function moveCameraTowardsTarget(
  state: SmoothCameraState,
  deltaTime = 1,
  blend = DEFAULT_BLEND,
) {
  const dt = Number.isFinite(deltaTime) ? Math.max(0, Math.min(deltaTime, MAX_DELTA)) : 1;
  const amount = Math.max(0, Math.min(1, blend * dt));

  state.x += (state.targetX - state.x) * amount;
  state.y += (state.targetY - state.y) * amount;
}
