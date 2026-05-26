import { Application, Text } from "pixi.js";

type LootPickupPayload = {
  type?: string;
  itemId?: string;
  name?: string;
  weaponVisualId?: string;
};

type CombatPayload = {
  kind?: string;
  defenderId?: string;
  targetId?: string;
  damage?: number;
};

type LootPickupEvent = {
  type?: string;
  payload?: LootPickupPayload;
};

type CombatEvent = {
  type?: string;
  payload?: CombatPayload;
};

type FloatingText = {
  node: Text;
};

const INSTALLED = Symbol.for("areloria.client2d.lootPickupFeedback");

function pickupPayload(event: LootPickupEvent): LootPickupPayload {
  return event?.payload ?? {};
}

function pickupLabel(event: LootPickupEvent): string {
  const payload = pickupPayload(event);
  if (payload.type === "weapon") {
    return `+ ${payload.weaponVisualId ?? payload.name ?? payload.itemId ?? "Weapon"}`;
  }
  return "+ Loot Capsule";
}

function combatPayload(event: CombatEvent): CombatPayload {
  return event?.payload ?? {};
}

function combatLabel(event: CombatEvent): string {
  const payload = combatPayload(event);
  const damage = Number(payload.damage ?? 0);
  return damage > 0 ? `-${Math.round(damage)}` : "hit";
}

function spawnFloatingText(app: Application, active: FloatingText[], text: string, fill: number, stroke: number, yOffset: number): void {
  const node = new Text({
    text,
    style: {
      fontFamily: "monospace",
      fontSize: 16,
      fontWeight: "900",
      fill,
      stroke: { color: stroke, width: 4 },
    },
  });

  node.anchor.set(0.5, 1);
  node.x = app.screen.width / 2;
  node.y = app.screen.height / 2 + yOffset;
  node.alpha = 1;
  node.zIndex = 999999;

  app.stage.sortableChildren = true;
  app.stage.addChild(node);
  active.push({ node });
}

export function initLootFeedback(app: Application, networkClient: any): void {
  if (!app || !networkClient || (app as any)[INSTALLED]) return;
  (app as any)[INSTALLED] = true;

  const active: FloatingText[] = [];

  networkClient.on?.("server:loot_picked_up" as any, (event: LootPickupEvent) => {
    spawnFloatingText(app, active, pickupLabel(event), 0xeafff0, 0x103818, -76);
  });

  const onCombat = (event: CombatEvent) => {
    const payload = combatPayload(event);
    if (payload.kind && payload.kind !== "hit") return;
    spawnFloatingText(app, active, combatLabel(event), 0xff5151, 0x2b0202, -96);
  };

  networkClient.on?.("server:combat_event" as any, onCombat);
  networkClient.on?.("warfront_combat" as any, onCombat);

  app.ticker.add((ticker) => {
    const delta = Number(ticker.deltaTime || 1);
    for (let i = active.length - 1; i >= 0; i -= 1) {
      const item = active[i];
      item.node.y -= 0.75 * delta;
      item.node.alpha = Math.max(0, item.node.alpha - 0.018 * delta);

      if (item.node.alpha <= 0) {
        app.stage.removeChild(item.node);
        item.node.destroy();
        active.splice(i, 1);
      }
    }
  });
}
