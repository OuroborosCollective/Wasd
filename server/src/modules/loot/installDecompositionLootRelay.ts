import { WorldTick } from "../../core/WorldTick.js";

const installed = Symbol.for("areloria.decompositionLootRelay");
const relayTimers = new WeakMap<object, ReturnType<typeof setInterval>>();

function toWorldPosition(position: any): { x: number; y: number; z: number } {
  return {
    x: Number(position?.x ?? 0) / 1000,
    y: Number(position?.y ?? 0) / 1000,
    z: Number(position?.z ?? 0) / 1000,
  };
}

export function installDecompositionLootRelay(): void {
  const proto = WorldTick.prototype as any;
  if (proto[installed]) return;
  proto[installed] = true;

  const start = proto.start;
  const stop = proto.stop;

  proto.start = function (...args: unknown[]) {
    const result = start.apply(this, args);
    if (relayTimers.has(this)) return result;

    const timer = setInterval(() => {
      const drain = this.npcSystem?.drainLootCapsules;
      if (typeof drain !== "function") return;

      for (const capsule of drain.call(this.npcSystem) ?? []) {
        if (!capsule?.id || this.lootEntities?.has?.(capsule.id)) continue;
        const item = capsule.items?.[0] ?? { itemId: "energy_core", count: 1 };
        this.lootEntities?.set?.(capsule.id, {
          id: capsule.id,
          position: toWorldPosition(capsule.position),
          item: {
            id: String(item.itemId ?? "energy_core"),
            name: String(item.itemId ?? "Energy Core"),
            type: "loot_capsule",
            quantity: Number(item.count ?? 1),
            gold: Number(capsule.gold ?? 0),
          },
          glbPath: null,
          visualType: "loot_capsule",
          sourceNpcId: capsule.sourceNpcId,
        });
      }
    }, 100);

    relayTimers.set(this, timer);
    return result;
  };

  proto.stop = function (...args: unknown[]) {
    const timer = relayTimers.get(this);
    if (timer) {
      clearInterval(timer);
      relayTimers.delete(this);
    }
    return stop.apply(this, args);
  };
}
