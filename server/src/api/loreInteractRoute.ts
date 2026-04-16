import { Router } from "express";
import { GameConfig } from "../config/GameConfig.js";

/** GET /api/lore/interact — tiny JSON flavour + design hints (bots-safe). */
export function loreInteractRouter(): Router {
  const r = Router();
  r.get("/interact", (_req, res) => {
    const d = GameConfig.interactDistance;
    res.json({
      kind: "lore_interact",
      radius: d,
      unit: "world_units",
      haiku: {
        de: `Beute ruft dich nah — / ${d} Schritte Welt und Glanz, / Worte folgen dann.`,
        en: `Loot whispers close by — / ${d} paces bind you to gold, / then voices reply.`,
      },
      fauna: {
        birds: "Die Raben des Händlers zählen deine Schritte bis zur Truhe.",
        beasts: "Wölfe schnappen erst zu, wenn du näher als dein Angriffsradius bist.",
      },
      hint: "Client `shared/interaction.ts` INTERACT_DISTANCE must match GameConfig.interactDistance; run `node scripts/check-interact-consistency.mjs`.",
    });
  });
  return r;
}
