# 1. OBJECTIVE

Analyze the Areloria/Wasd MMORPG project from the agent package documents and create a prioritized implementation plan for the next development steps. The goal is to continue building on the existing vertical slice while maintaining architectural integrity.

# 2. CONTEXT SUMMARY

**Project:** Areloria/Ouroboros - Server-authoritative browser MMORPG built with TypeScript, Three.js (client), Express/WebSocket (server)

**Current State (from Agent Package):**
- Strong internal vertical slice with working gameplay loop
- Data-driven NPCs, Quests, Dialogues, Spawns via JSON
- Server-authoritative movement and state
- Chunk system (64x64), Observer simulation
- Item Registry as Source of Truth
- Persistence over restart
- Reputation system, Quest chains with prerequisites
- Content Validator and Manifest system

**Documentation Files Present:**
- README_START_HERE.md ✓
- PROJECT_LOCK_RULES.md ✓
- final-lock/FINAL_TRUTH.md ✓
- 100+ design docs in /docs
- 55+ JSON game-data files

**Core Rules (MUST NOT BREAK):**
- Server authority
- 64x64 chunks
- Observer simulation
- Data-driven content (NPCs, Quests, Dialogues, Spawns)
- Item Registry as Source of Truth
- Generic runtime (no One-Off logic)

# 3. APPROACH OVERVIEW

Following the "Gardener Mode" from the agent package:
1. **Assess current state** - Run builds and tests to understand what's working
2. **Choose ONE small safe step** - Based on recommended paths in agent package
3. **Implement and validate** - Run build, tests, and validators
4. **Report structured results**

**Safe vs Unsafe Categories (from Agent Package):**
- SAFE: Content validation, Manifests, Data-driven content, Small UI/UX, Tests, Build hardening
- UNSAFE: WorldTick redesign, Chunk/Observer changes, Combat core overhaul, Auth system

# 4. IMPLEMENTATION STEPS

## Step 1: Assess Current State
**Goal:** Understand what works and what needs attention
**Method:**
- Run `npm run build` to verify client and server compile
- Run `npm run test` to see test results
- Check if Content Validator runs
**Reference:** package.json, vitest.config.ts

## Step 2: Choose Priority Area
**Goal:** Select the most impactful small next step
**Method:** Based on agent package recommendations:
- "Echte Live-In-Game-Beweise für vorhandene Systeme" (Real in-game proof)
- "kleine Quest-/Dialog-Politur" (Small quest/dialogue polish)
- "Build-/Validator-/Manifest-Härtung" (Build/Validator/Manifest hardening)

**Recommended First Step:** Run build and tests to establish baseline, then add a small data-driven enhancement or fix

## Step 3: Execute Chosen Step
**Goal:** Make ONE small, safe change
**Method:**
- If build passes: Add a small content pack or fix a minor issue
- If issues found: Fix only what's necessary
**Reference:** game-data/*.json for content, server/src/modules/* for code

## Step 4: Validate and Report
**Goal:** Verify the change doesn't break existing systems
**Method:**
- Run build
- Run tests
- Run content validator if available
- Report in agent format (A. Ziel, B. Dateien, C. Änderungen, D. Prüfungen, E. Ergebnis, F. Risiken, G. Nächster Schritt)


# 5. TESTING AND VALIDATION

## Success Criteria for Each Step

**Build Success:**
- `npm run build` completes without errors
- Both client and server compile successfully

**Test Success:**
- `npm run test` runs without critical failures
- Core gameplay loop tests pass (quest, inventory, combat)

**Content Validation Success:**
- Content Validator passes for any modified data files
- All referenced IDs are valid (questIds, itemIds, npcIds, dialogue nodes)

## Validation Commands Reference

```bash
# Full build
npm run build

# Run tests
npm run test

# Run linter
npm run lint
```

## Next Steps After This Plan

Based on the agent package's recommendations, the first actionable task should be:

1. **Run build and tests** to establish baseline
2. **Fix any blocking issues** found
3. **Add one small enhancement** such as:
   - A new quest chain via game-data/quests/quests.json
   - A new NPC via game-data/npc/npcs.json
   - A small UI polish that doesn't break data truth
   - Additional test coverage for existing systems

The agent package emphasizes: **"Arbeite präzise. Arbeite klein. Arbeite nachvollziehbar. Beschädige nichts, was schon lebt."**
