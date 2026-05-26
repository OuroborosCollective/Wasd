import { Application, Text } from "pixi.js";

type LootPickupPayload = {
  type?: string;
  itemId?: string;
  name?: string;
  weaponVisualId?: string;
};

type LootPickupEvent = {
  type?: string;
  payload?: LootPickupPayload;
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

export function initLootFeedback(app: Application, networkClient: any): void {
  if (!app || !networkClient || (app as any)[INSTALLED]) return;
  (app as any)[INSTALLED] = true;

  const active: FloatingText[] = [];

  networkClient.on?.("server:loot_picked_up" as any, (event: LootPickupEvent) => {
    const node = new Text({
      text: pickupLabel(event),
      style: {
        fontFamily: "monospace",
        fontSize: 16,
        fontWeight: "700",
        fill: 0xeafff0,
        stroke: { color: 0x103818, width: 4 },
      },
    });

    node.anchor.set(0.5, 1);
    node.x = app.screen.width / 2;
    node.y = app.screen.height / 2 - 76;
    node.alpha = 1;
    node.zIndex = 999999;

    app.stage.sortableChildren = true;
    app.stage.addChild(node);
    active.push({ node });
  });

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
