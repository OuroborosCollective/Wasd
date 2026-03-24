/**
 * Character API Routes
 * GET  /api/character/manifest      – Returns the full character manifest (bodies, heads, colors)
 * GET  /api/character/:playerId     – Returns saved appearance for a player
 * POST /api/character/:playerId     – Save/update character appearance
 */

import { Router, Request, Response } from 'express';
import { characterAssembly, CharacterAppearance } from '../modules/character/CharacterAssemblySystem.js';
import { db } from '../core/Database.js';

const router = Router();

/** GET /api/character/manifest */
router.get('/manifest', (_req: Request, res: Response) => {
  const manifest = characterAssembly.getManifest();
  if (!manifest) {
    return res.status(503).json({ error: 'Character manifest not loaded yet.' });
  }
  res.json(manifest);
});

/** GET /api/character/:playerId */
router.get('/:playerId', async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    const result = await db.query(
      'SELECT appearance FROM players WHERE id = $1',
      [playerId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found.' });
    }
    const appearance = result.rows[0].appearance;
    res.json({ appearance: appearance ?? null });
  } catch (err) {
    console.error('characterRoute GET error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/** POST /api/character/:playerId */
router.post('/:playerId', async (req: Request, res: Response) => {
  try {
    const playerId = Array.isArray(req.params.playerId) ? req.params.playerId[0] : req.params.playerId;
    const raw = req.body as Partial<CharacterAppearance>;

    // Validate and sanitize
    const appearance = characterAssembly.validateAppearance(raw);

    // Resolve model paths for confirmation
    const paths = characterAssembly.resolveModelPaths(appearance);

    // Persist to database
    await db.query(
      `UPDATE players
       SET appearance = $1, display_name = $2, updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(appearance), appearance.name, playerId]
    );

    res.json({
      ok: true,
      appearance,
      modelPaths: paths,
    });
  } catch (err) {
    console.error('characterRoute POST error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/** GET /api/character/npc/:npcType – Get NPC model URL */
router.get('/npc/:npcType', (req: Request, res: Response) => {
  const npcType = Array.isArray(req.params.npcType) ? req.params.npcType[0] : req.params.npcType;
  const url = characterAssembly.getNPCModelUrl(npcType as string);
  if (!url) {
    return res.status(404).json({ error: 'NPC model not found.' });
  }
  res.json({ url });
});

export default router;
