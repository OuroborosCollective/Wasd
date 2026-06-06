/**
 * CHARACTER PROFILE ROUTE
 *
 * REST API for character profile management.
 * Deterministic: No Date.now(), no Math.random().
 */

import { Router } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { characterService } from "./characterRuntime.js";
import {
  isCharacterArchetype,
  normalizeDisplayName,
} from "./CharacterTypes.js";

const router = Router();

router.get("/api/character/profile", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);

  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    res.status(401).json({ ok: false, error: "authenticated_player_required" });
    return;
  }

  const profile = await characterService.getCharacterProfile(identity.playerId);

  res.json({
    ok: true,
    playerId: identity.playerId,
    profile,
  });
});

router.post("/api/character/create", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);

  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    res.status(401).json({ ok: false, error: "authenticated_player_required" });
    return;
  }

  const displayName = normalizeDisplayName(req.body?.displayName);
  const archetype = req.body?.archetype;

  if (!displayName) {
    res.status(400).json({ ok: false, error: "invalid_name" });
    return;
  }

  if (!isCharacterArchetype(archetype)) {
    res.status(400).json({ ok: false, error: "invalid_archetype" });
    return;
  }

  const result = await characterService.createCharacter({
    playerId: identity.playerId,
    displayName,
    archetype,
    currentTick: Math.max(0, Math.floor(Number(req.body?.currentTick ?? 0))),
  });

  res.status(result.ok ? 200 : 409).json({
    ok: result.ok,
    result,
  });
});

export default router;