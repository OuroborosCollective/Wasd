# Content Authoring Guide

This guide describes how to add new content to Areloria.

## Adding a New NPC
1. Add an entry to `game-data/npc/npcs.json`.
2. Define `id`, `name`, `role`, `dialogueId`, `faction`.
3. If the NPC gives quests, add their quest IDs to `questHooks`.

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

## Common Mistakes
- **Broken References**: Ensure `dialogueId` in `npcs.json` matches an `id` in `dialogues.json`.
- **Missing Nodes**: Ensure `nextNodeId` in `dialogues.json` exists in the `nodes` object of that dialogue.
- **Invalid Quest IDs**: Ensure `prerequisiteQuestIds` in `quests.json` matches an `id` in `quests.json`.
- **Validation**: Run `npx ts-node server/src/tools/validateContent.ts` to check for errors.
