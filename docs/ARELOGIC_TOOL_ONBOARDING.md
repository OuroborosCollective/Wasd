# ARELogic Tool Onboarding Contract

**PR:** #1784  
**Status:** Implemented  
**Date:** 2026-06-07

---

## 1. Summary

This PR implements deterministic tool onboarding for new players. Players can claim a starter tool bundle that includes mining, fishing, and woodcutting tools, which are automatically equipped.

**Key Changes:**
- New server route: `POST /api/onboarding/claim-starter-tools`
- Client dispatch function: `dispatchClaimStarterTools()`
- "Claim Starter Tools" button in GatheringToolsPanel
- New quest objective: "Rüste Werkzeuge aus" (Equip Gathering Tools)
- Idempotent claim flow (calling twice doesn't duplicate tools)
- No Math.random() or Date.now() for gameplay state

---

## 2. Why Tool Onboarding After Resource Contract

**Problem:** After PRs #1781 and #1782 implemented resource node contracts with tool requirements:
- Ore nodes require `mining_tool` slot
- Fish spots require `fishing_tool` slot
- Trees can be hand-gathered (bare-handed exception for MVP)

Players moving outside the starter village would encounter `missing_tool` errors because there was no way to obtain their first tools.

**Solution:** A deterministic, server-authoritative onboarding flow that gives new players their first tools automatically.

---

## 3. Starter Tool Bundle

The starter tool bundle includes:

| Item ID | Name | Slot | Purpose |
|---------|------|------|---------|
| `copper_pickaxe` | Copper Pickaxe | `mining_tool` | Mine ore nodes |
| `simple_fishing_rod` | Simple Fishing Rod | `fishing_tool` | Catch fish |
| `wooden_axe` | Wooden Axe | `woodcutting_tool` | Chop trees (optional for MVP) |

**Note:** Trees (`starter_tree_001`) can still be hand-gathered, so the wooden axe is optional but provided for a complete tool set.

---

## 4. Server-Authoritative Claim Flow

### Route: `POST /api/onboarding/claim-starter-tools`

**Input:**
```json
{
  "playerId": "player_123"
}
```

**Headers:**
- `x-player-id: player_123`

**Response (first claim):**
```json
{
  "ok": true,
  "result": {
    "changed": true,
    "tools": ["copper_pickaxe", "simple_fishing_rod", "wooden_axe"],
    "equipped": ["mining_tool", "fishing_tool", "woodcutting_tool"]
  }
}
```

**Response (idempotent - already claimed):**
```json
{
  "ok": true,
  "result": {
    "changed": false,
    "tools": ["copper_pickaxe", "simple_fishing_rod", "wooden_axe"],
    "equipped": ["mining_tool", "fishing_tool", "woodcutting_tool"],
    "reason": "already_equipped"
  }
}
```

### Flow

```
Client: POST /api/onboarding/claim-starter-tools
         ↓
Server: Check if tools already equipped
         ↓
  If already equipped → return changed=false, reason=already_equipped
         ↓
  If not equipped:
    1. Add tools to inventory (if not present)
    2. Auto-equip each tool
    3. Return changed=true, list of equipped slots
         ↓
Client: Refetch LiveGameplaySnapshot
         ↓
UI: Update equipment panel, inventory, quest objectives
```

---

## 5. Equipment Slot Mapping

The tools map to equipment slots as follows:

| Tool ID | Slot ID | Skill Bonus |
|---------|---------|------------|
| `copper_pickaxe` | `mining_tool` | Mining XP +10%, respawn -2 ticks |
| `simple_fishing_rod` | `fishing_tool` | Fishing XP +10%, respawn -2 ticks |
| `wooden_axe` | `woodcutting_tool` | Woodcutting XP +10%, respawn -2 ticks |

These definitions are in `server/src/equipment/EquipmentTypes.ts`.

---

## 6. Quest Integration

### New Objective

All start path quests now include an additional objective:

**Objective ID:** `equip_gathering_tools`  
**Label:** "Rüste Werkzeuge aus"  
**Required:** 2 (mining_tool + fishing_tool)

### Example: Angler Quest

**Before claiming tools:**
```
Quest: Startpfad: Angler
Status: active
Objectives:
  1. Rüste Werkzeuge aus: 0/2 ☐
  2. Fange 3 Raw Fish: 0/3 ☐
```

**After claiming tools:**
```
Quest: Startpfad: Angler
Status: active
Objectives:
  1. Rüste Werkzeuge aus: 2/2 ✓
  2. Fange 3 Raw Fish: 0/3 ☐
```

---

## 7. Determinism Rules

1. **No Math.random()** in any gameplay logic
2. **No Date.now()** for gameplay state (only for logging/debug)
3. **Same inputs → same outputs**: Claiming with same playerId always produces same result
4. **Idempotent**: Calling claim twice returns same state without duplicates
5. **Stable ordering**: All lists sorted by ID for deterministic iteration

---

## 8. Known Limitations

1. **No NPC Shop**: Players cannot buy/sell tools to NPCs yet
2. **No Full Crafting Tree**: Tools cannot be crafted from recipes yet
3. **No Durability**: Tools do not degrade or break
4. **No Tool Upgrades**: Only basic starter tools available
5. **Wooden Axe Optional**: Trees can be hand-gathered, so axe is not strictly required

---

## 9. Next PRs

| PR | Title | Description |
|----|-------|-------------|
| #1785 | Tool Crafting Recipes | Players can craft better tools |
| #1786 | NPC Resource Economy Loop | NPCs buy/sell resources |
| #1787 | Resource Selling / Vendor Contract | Resource value system |
| #1788 | World POI / Campfire / Mining Camp | Procedural world features |

---

## 10. Files Changed

### Server

| File | Changes |
|------|---------|
| `server/src/routes/onboardingRoute.ts` | **New** - Claim starter tools endpoint |
| `server/src/core/ServerBootstrap.ts` | Mount `/api/onboarding` route |
| `server/src/character/StartPathQuestLine.ts` | Add `equip_gathering_tools` objective |
| `server/src/routes/gameplaySnapshot.ts` | Pass equipment to quest derivation |
| `server/src/tests/tool-onboarding-contract.test.ts` | **New** - Contract tests |

### Client

| File | Changes |
|------|---------|
| `apps/client-2d/src/game/gameplayActions.ts` | Add `dispatchClaimStarterTools()` |
| `apps/client-2d/src/ui/windows/GatheringToolsPanel.tsx` | Add claim button UI |
| `apps/client-2d/src/ui/windows/gatheringToolsPanel.css` | Button styling |

### Documentation

| File | Changes |
|------|---------|
| `docs/ARELOGIC_TOOL_ONBOARDING.md` | **New** - This documentation |

---

## 11. Testing

```bash
# Run tool onboarding tests
pnpm --filter @wasd/server test -- --run src/tests/tool-onboarding-contract.test.ts

# Run start path quest tests (updated for equipment)
pnpm --filter @wasd/server test -- --run src/tests/start-path-quest-progress.test.ts

# Run gathering service contract tests
pnpm --filter @wasd/server test -- --run src/tests/gathering-service-contract.test.ts

# Typecheck
pnpm --filter @wasd/server typecheck
pnpm --filter @wasd/client-2d typecheck
```

---

## 12. Live Verification Steps

1. Open /2d/ and load a character
2. Wait for heartbeat OK
3. Open Equipment/Gathering Tools panel
4. Verify "Claim Starter Tools" button is visible
5. Click "Claim Starter Tools"
6. Verify toast: "Starter tools claimed! Equipped: mining_tool, fishing_tool, woodcutting_tool"
7. Verify equipment slots show Pickaxe and Fishing Rod
8. Verify quest objective "Rüste Werkzeuge aus" shows 2/2 ✓
9. Click button again - verify "already equipped" message (idempotent)
10. Move to ore node outside starter village
11. Try gathering - should NOT get `missing_tool` error
12. Reload page - tools should still be equipped

---

## 13. Data Integrity

- **Idempotency**: Claiming twice does not duplicate tools
- **Auto-equip**: Tools are automatically equipped after adding to inventory
- **Persistence**: Tool ownership and equipment state persist across sessions
- **No client-side mutation**: Server is authoritative for all state changes

---

*Document generated for PR #1784*  
*Part of the Areloria/WASD Tool Onboarding effort*