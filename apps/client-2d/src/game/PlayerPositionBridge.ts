import type { GameplayWorldPosition } from "./gameplayActions";

const PLAYER_POSITION_BRIDGE_KEY = "wasd:2d:player-position:v1";

export function publishPlayerPositionBridge(input: { x: number; z: number } | null | undefined): void {
  if (!input) return;
  const x = Number(input.x);
  const z = Number(input.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return;
  sessionStorage.setItem(
    PLAYER_POSITION_BRIDGE_KEY,
    JSON.stringify({ x: x / 1000, y: z / 1000 }),
  );
}

export function readPlayerPositionBridge(): GameplayWorldPosition | null {
  const raw = sessionStorage.getItem(PLAYER_POSITION_BRIDGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GameplayWorldPosition>;
    const x = Number(parsed.x);
    const y = Number(parsed.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  } catch {
    return null;
  }
}
