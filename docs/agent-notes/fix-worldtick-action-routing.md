# Fix WorldTick action routing

Issue: attack/talk logs appear, but actions do not execute.

Target file: `server/src/core/WorldTick.ts`

Required change:

- `USE_SKILL` with `skillId === "atk"` must call `handleAttack()` after cooldown.
- `attack` and `interact` must normalize target IDs from `targetId`, `npcId`, `enemyId`, `lootId`, and `payload.*` variants.
- `interact` must accept client `npcId` and `lootId`, not only `targetId`.
- Missing/out-of-range targets must return visible feedback instead of silent no-op.

Commit goal: `fix(server): route combat and interaction commands to action handlers`
