import { Router } from "express";
import { GameConfig } from "../config/GameConfig.js";
import {
  getWorldFragmentById,
  listWorldFragmentSummaries,
  loadWorldFragmentsFile,
} from "../modules/lore/worldFragments.js";

/**
 * GET /api/lore/interact — flavour + design hints (bots-safe JSON).
 * GET /api/lore/fragments — list Weltenfragmente (titles + ids).
 * GET /api/lore/fragments/:id — one fragment by id.
 */
export function loreRouter(): Router {
  const r = Router();

  r.get("/interact", (_req, res) => {
    const d = GameConfig.interactDistance;
    const pack = loadWorldFragmentsFile();
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
      worldFragments: {
        version: pack.version,
        count: pack.fragments.length,
        summary: listWorldFragmentSummaries(),
      },
      hint: "Client `@wasd/shared` INTERACT_DISTANCE must match GameConfig.interactDistance; run `node scripts/check-interact-consistency.mjs`.",
    });
  });

  r.get("/fragments", (_req, res) => {
    const pack = loadWorldFragmentsFile();
    res.json({
      kind: "world_fragments",
      version: pack.version,
      fragments: listWorldFragmentSummaries(),
    });
  });

  r.get("/fragments/:id", (req, res) => {
    const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const frag = getWorldFragmentById(id);
    if (!frag) {
      res.status(404).json({ error: "not_found", id });
      return;
    }
    res.json({
      kind: "world_fragment",
      fragment: frag,
    });
  });

  return r;
}
