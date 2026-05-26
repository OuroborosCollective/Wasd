import { Application, Container, Text } from "pixi.js";

type EntityLike = {
  root: Container;
};

type CombatPayload = {
  kind?: string;
  defenderId?: string;
  targetId?: string;
  damage?: number;
};

type CombatEvent = {
  type?: string;
  payload?: CombatPayload;
};

type FloatingDamage = {
  node: Text;
};

const INSTALLED = Symbol.for("areloria.client2d.combatDamageFeedback");

function combatPayload(event: CombatEvent): CombatPayload {
  return event?.payload ?? {};
}

function defenderId(payload: CombatPayload): string | null {
  return payload.defenderId ?? payload.targetId ?? null;
}

function damageLabel(payload: CombatPayload): string {
  const damage = Number(payload.damage ?? 0);
  return damage > 0 ? `-${Math.round(damage)}` : "hit";
}

export function initCombatDamageFeedback(app: Application, networkClient: any, entities: Map<string, EntityLike>): void {
  if (!app || !networkClient || !entities || (app as any)[INSTALLED]) return;
  (app as any)[INSTALLED] = true;

  const active: FloatingDamage[] = [];

  function spawn(event: CombatEvent): void {
    const payload = combatPayload(event);
    if (payload.kind && payload.kind !== "hit") return;

    const target = defenderId(payload);
    const entity = target ? entities.get(target) ?? entities.get(target === "self" ? "self" : target) : null;
    if (!entity?.root) return;

    const node = new Text({
      text: damageLabel(payload),
      style: {
        fontFamily: "monospace",
        fontSize: 18,
        fontWeight: "900",
        fill: 0xff5151,
        stroke: { color: 0x2b0202, width: 5 },
      },
    });

    node.anchor.set(0.5, 1);
    node.x = entity.root.x;
    node.y = entity.root.y - 54;
    node.alpha = 1;
    node.zIndex = 1000000;

    app.stage.sortableChildren = true;
    app.stage.addChild(node);
    active.push({ node });
  }

  networkClient.on?.("server:combat_event" as any, spawn);
  networkClient.on?.("warfront_combat" as any, spawn);

  app.ticker.add((ticker) => {
    const delta = Number(ticker.deltaTime || 1);
    for (let i = active.length - 1; i >= 0; i -= 1) {
      const item = active[i];
      item.node.y -= 0.95 * delta;
      item.node.alpha = Math.max(0, item.node.alpha - 0.024 * delta);

      if (item.node.alpha <= 0) {
        app.stage.removeChild(item.node);
        item.node.destroy();
        active.splice(i, 1);
      }
    }
  });
}
