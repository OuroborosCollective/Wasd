import type { InputFrame } from "../net/protocol";
import type { EntityState } from "../world/entities";
import { normalizeVector } from "../world/entities";

export interface PlayerControllerOptions {
  speedUnitsPerSecond: number;
}

export function applyPlayerInput(
  player: EntityState,
  input: InputFrame,
  fixedDtSec: number,
  options: PlayerControllerOptions
): EntityState {
  const dir = normalizeVector(input.moveX, input.moveY);

  const vx = dir.x * options.speedUnitsPerSecond;
  const vy = dir.y * options.speedUnitsPerSecond;

  return {
    ...player,
    vx,
    vy,
    x: player.x + vx * fixedDtSec,
    y: player.y + vy * fixedDtSec
  };
}