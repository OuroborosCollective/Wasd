import type { Container } from "pixi.js";

const DEFAULT_BLEND = 0.22;
const MAX_DELTA = 2;

export type VisualPoint = {
  x: number;
  y: number;
};

export function moveVisualTowards(
  root: Container,
  target: VisualPoint,
  deltaTime = 1,
  blend = DEFAULT_BLEND,
) {
  const dt = Number.isFinite(deltaTime) ? Math.max(0, Math.min(deltaTime, MAX_DELTA)) : 1;
  const amount = Math.max(0, Math.min(1, blend * dt));

  root.x += (target.x - root.x) * amount;
  root.y += (target.y - root.y) * amount;
  root.zIndex = root.y;
}
