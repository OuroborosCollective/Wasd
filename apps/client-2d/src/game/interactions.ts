import type { EntityState } from "../world/entities";

export interface InteractionTarget {
  entityId: string;
  kind: "npc" | "loot";
  label: string;
  distance: number;
}

export function findNearestInteractionTarget(
  player: EntityState | null,
  entities: EntityState[],
  maxDistance: number
): InteractionTarget | null {
  if (!player) return null;

  let best: InteractionTarget | null = null;

  for (const entity of entities) {
    if (entity.kind !== "npc" && entity.kind !== "loot") continue;

    const distance = Math.hypot(entity.x - player.x, entity.y - player.y);

    if (distance > maxDistance) continue;

    if (!best || distance < best.distance) {
      best = {
        entityId: entity.id,
        kind: entity.kind,
        label:
          entity.kind === "npc"
            ? `Talk to ${entity.name ?? "NPC"}`
            : `Pick up ${entity.name ?? "Loot"}`,
        distance
      };
    }
  }

  return best;
}