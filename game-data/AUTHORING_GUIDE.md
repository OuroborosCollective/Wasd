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

## Adding Equipment / Paperdoll Slots
1. Add canonical equipment slots to `game-data/equipment/equipment-slots.json`.
2. Define `slotId`, `title`, `emptyTitle`, `kind`, and deterministic `order`.
3. Add authored equippable item metadata to `game-data/equipment/equipment-items.json`.
4. Every authored equipment `itemId` must already exist in server inventory definitions.
5. Paperdoll and gameplay snapshots load this metadata from `game-data`; do not create UI-only slots or fake paperdoll data.

## Placing Spawns
1. Add an entry to `game-data/spawns/npc-spawns.json`.
2. Define `npcId`, `position` (x, y).

## Common Mistakes
- **Broken References**: Ensure `dialogueId` in `npcs.json` matches an `id` in `dialogues.json`.
- **Missing Nodes**: Ensure `nextNodeId` in `dialogues.json` exists in the `nodes` object of that dialogue.
- **Invalid Quest IDs**: Ensure `prerequisiteQuestIds` in `quests.json` matches an `id` in `quests.json`.
- **Invalid Equipment Item IDs**: Ensure every `game-data/equipment/equipment-items.json` `itemId` exists in inventory definitions.
- **Invalid Equipment Slot IDs**: Ensure equipment item `slotId` values exist in `game-data/equipment/equipment-slots.json`.
- **Validation**: Run `npx ts-node server/src/tools/validateContent.ts` to check for errors.
