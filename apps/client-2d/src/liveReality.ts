export type LiveRealityEntity = {
  id?: string;
  playerId?: string;
  npcId?: string;
  lootId?: string;
  name?: string;
  role?: string;
  itemId?: string;
  item?: { name?: string } | null;
  position?: { x?: number; y?: number; z?: number } | null;
  x?: number;
  y?: number;
  z?: number;
  tx?: number;
  tz?: number;
};

export function liveNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function liveX(entity: LiveRealityEntity | null | undefined): number {
  return liveNumber(entity?.position?.x ?? entity?.x ?? entity?.tx ?? 0);
}

export function liveZ(entity: LiveRealityEntity | null | undefined): number {
  return liveNumber(entity?.position?.z ?? entity?.position?.y ?? entity?.z ?? entity?.y ?? entity?.tz ?? 0);
}

export function liveId(entity: LiveRealityEntity, fallback: string): string {
  return String(entity.id ?? entity.playerId ?? entity.npcId ?? entity.lootId ?? entity.name ?? fallback);
}

export function liveName(entity: LiveRealityEntity, fallback: string): string {
  return String(entity.name ?? entity.role ?? entity.item?.name ?? entity.itemId ?? fallback);
}

export function liveList(value: unknown): LiveRealityEntity[] {
  if (Array.isArray(value)) return value as LiveRealityEntity[];
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).map(([id, data]) => ({ id, ...(data as LiveRealityEntity) }));
  }
  return [];
}

export function livePayload(event: any): any {
  return event?.payload ?? event ?? {};
}

export function liveSummary(payload: any): { players: LiveRealityEntity[]; npcs: LiveRealityEntity[]; loot: LiveRealityEntity[] } {
  return {
    players: liveList(payload.players),
    npcs: liveList(payload.npcs ?? payload.agents),
    loot: liveList(payload.loot),
  };
}
