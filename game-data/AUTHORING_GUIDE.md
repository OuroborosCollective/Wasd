# Content Authoring Guide

This guide describes how to add new content to Areloria.

## Adding a New NPC
1. Add an entry to `game-data/npc/npcs.json`.
2. Define `id`, `name`, `role`, `dialogueId`, `faction`.
3. If the NPC gives quests, add their quest IDs to `questHooks`.
4. Make sure `role` has a matching static visual rule in `game-data/visual/npc_visual_profiles.json` or intentionally falls back to `generic_npc`.

## Adding a New Dialogue
1. Add an entry to `game-data/dialogue/dialogues.json`.
2. Define `id`, `greeting`, `nodes`.
3. Each node contains `text` and `choices`.
4. Choices point to `nextNodeId`.

## Adding a New Quest
1. Add an entry to `game-data/quests/quests.json`.
2. Define `id`, `title`, `objective`, `giverNpcId`.
3. Add prerequisites or rewards if needed.

## Placing Spawns
1. Add an entry to `game-data/spawns/npc-spawns.json`.
2. Define `npcId`, `position` (x, y).

## Adding Visual Truth Rules
1. Add only static authoring rules under `game-data/visual/`.
2. Do not add screenshots, fake render states, or preselected runtime assets as truth.
3. Visual selection must derive from `VisualSignature`: `worldSeed`, `worldTick`, `chunkX`, `chunkZ`, `kappa1000`, entity ID, role/semantic type, biome, faction/culture, and optional state hash.
4. Add new biome styles to `game-data/visual/biome_visual_profiles.json`.
5. Add new NPC role styles to `game-data/visual/npc_visual_profiles.json`.
6. Add new building styles to `game-data/visual/building_visual_profiles.json`.
7. Add new crop/anchor rules to `game-data/visual/asset_crop_profiles.json`.
8. Layer order belongs in `game-data/visual/world_render_layers.json`.

## Common Mistakes
- **Broken References**: Ensure `dialogueId` in `npcs.json` matches an `id` in `dialogues.json`.
- **Missing Nodes**: Ensure `nextNodeId` in `dialogues.json` exists in the `nodes` object of that dialogue.
- **Invalid Quest IDs**: Ensure `prerequisiteQuestIds` in `quests.json` matches an `id` in `quests.json`.
- **Fake Visual Truth**: Do not commit smoke-proof-only props, screenshot proof, local time, or random choices as game-data truth.
- **Validation**: Run `npx ts-node server/src/tools/validateContent.ts` to check for errors.
