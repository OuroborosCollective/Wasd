# NPC Resource Quest Loop

> Documentation Date: 2026-06-09
> Branch: `feat/npc-resource-quest-loop`

## Overview

The NPC Resource Quest Loop connects the resource economy loop to NPCs and quests. Players gather, process, and sell resources to complete quests given by NPCs, earning coins, XP, and reputation.

## Core Loop

```
Talk to NPC
  → receive quest
  → gather resource (wood_log)
  → process at station (wood_plank)
  → sell to NPC
  → return to NPC to complete
  → receive rewards (coins, XP, reputation)
```

## Quest Definition

### Mira's First Supply Order

| Field | Value |
|-------|-------|
| Quest ID | `village_supply_order_001` |
| Title | "Mira's First Supply Order" |
| NPC | `village_trader_001` (Mira the Quartermaster) |
| NPC Position | (462, 503) |
| Interaction Radius | 32 |

### Objectives

| Objective ID | Title | Type | Required | Target |
|--------------|-------|------|----------|--------|
| `gather_wood_logs` | Gather 2 Wood Logs | gather | 2 | `wood_log` |
| `process_wood_plank` | Process 1 Wood Plank | craft | 1 | `craft_wood_plank` |
| `sell_wood_plank` | Sell 1 Wood Plank to Mira | sell | 1 | `wood_plank` |
| `return_to_mira` | Return to Mira | talk | 1 | `village_trader_001` |

### Rewards

| Reward | Amount |
|--------|--------|
| Coins | 10 |
| Gathering XP | 25 |
| Crafting XP | 25 |
| Reputation with Mira | +1 |

## Server-Authoritative Contract

Client sends **intent only**:

- `POST /api/npc/talk` - Talk to NPC, updates quest progress
- `POST /api/quests/accept` - Accept quest from NPC
- `POST /api/quests/complete` - Complete quest and claim rewards

Server validates and mutates. Failed validation does not mutate state.

## API Endpoints

### POST /api/npc/talk

Talk to an NPC and update quest progress.

**Request:**
```json
{
  "playerId": "player-123",
  "npcId": "village_trader_001",
  "playerPosition": { "x": 462, "y": 503 }
}
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "dialogue": {
      "npcId": "village_trader_001",
      "displayName": "Mira the Quartermaster",
      "dialogueState": "quest_active_ready_to_sell",
      "line": "You have a wood plank? Perfect! Please sell it to me...",
      "availableQuestIds": [],
      "activeQuestIds": ["village_supply_order_001"],
      "completedQuestIds": []
    },
    "activeQuests": [...],
    "talkUpdated": true
  }
}
```

### POST /api/quests/accept

Accept a quest from an NPC.

**Request:**
```json
{
  "playerId": "player-123",
  "questId": "village_supply_order_001",
  "npcId": "village_trader_001",
  "playerPosition": { "x": 462, "y": 503 }
}
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "questId": "village_supply_order_001",
    "state": "active",
    "objectives": [...]
  }
}
```

### POST /api/quests/complete

Complete a quest and claim rewards.

**Request:**
```json
{
  "playerId": "player-123",
  "questId": "village_supply_order_001",
  "npcId": "village_trader_001",
  "playerPosition": { "x": 462, "y": 503 }
}
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "questProgress": {
      "questId": "village_supply_order_001",
      "state": "completed",
      "objectives": [...]
    },
    "reward": {
      "coins": 10,
      "gatheringXp": 25,
      "craftingXp": 25,
      "reputation": 1
    },
    "reputation": {
      "npcId": "village_trader_001",
      "playerId": "player-123",
      "reputation": 1,
      "completedQuestIds": ["village_supply_order_001"]
    }
  }
}
```

### GET /api/quests/active

Get all active quests for a player.

### GET /api/quests/available

Get all available quests for a player.

### GET /api/npc/dialogue

Get NPC dialogue for a player.

### GET /api/npc/reputation

Get NPC reputation for a player.

## Fail Reasons

| Reason | Description |
|--------|-------------|
| `missing_player` | Player ID not provided |
| `missing_npc` | NPC ID not found |
| `npc_too_far` | Player not within NPC interaction radius |
| `missing_quest` | Quest ID not found |
| `quest_not_available` | Quest is not in available state |
| `quest_already_active` | Quest is already active |
| `quest_already_completed` | Quest is already completed |
| `objective_not_complete` | Not all objectives are complete |
| `reward_already_claimed` | Reward has already been claimed |

## NPC Dialogue States

The NPC dialogue state is determined by quest progress:

| State | Trigger |
|-------|---------|
| `quest_available` | No active quest with this NPC |
| `quest_active_missing_wood` | Quest active, wood not gathered |
| `quest_active_ready_to_process` | Wood gathered, needs processing |
| `quest_active_ready_to_sell` | Plank crafted, ready to sell |
| `quest_ready_to_complete` | Sold, ready to return |
| `quest_completed` | Quest completed |

## NPC Reputation

On quest completion:
- Mira's reputation increases by 1
- Quest ID added to `completedQuestIds`

Reputation is persistent per player-NPC pair.

## LiveGameplaySnapshot Integration

The snapshot exposes:

```typescript
interface LiveGameplaySnapshot {
  // ... existing fields
  activeQuests: readonly LiveGameplayQuestProgress[];
  availableQuests: readonly LiveGameplayQuestProgress[];
  completedQuestIds: readonly string[];
  npcDialogues: readonly LiveGameplayNpcDialogue[];
  npcReputations: readonly LiveGameplayNpcReputation[];
}
```

## Determinism Rules

Hard rules enforced:
- **No** `Math.random()` in gameplay paths
- **No** `Date.now()` in gameplay state
- **No** client-authoritative mutation
- **No** unordered item mutation
- **No** partial mutation after failed validation
- Stable quest IDs
- Stable NPC IDs
- Stable objective ordering

## Test IDs

UI elements use stable test IDs for E2E testing:

| Test ID | Element |
|---------|---------|
| `npc-dialogue-village_trader_001` | NPC dialogue panel |
| `npc-dialogue-line-village_trader_001` | NPC dialogue line |
| `accept-quest-village_supply_order_001` | Accept quest button |
| `complete-quest-village_supply_order_001` | Complete quest button |
| `quest-tracker-village_supply_order_001` | Quest tracker |
| `quest-objective-gather_wood_logs` | Gather objective |
| `quest-objective-process_wood_plank` | Process objective |
| `quest-objective-sell_wood_plank` | Sell objective |
| `quest-objective-return_to_mira` | Return objective |
| `quest-reward-village_supply_order_001` | Reward preview |
| `npc-reputation-village_trader_001` | NPC reputation badge |

## Files

### Server

| File | Purpose |
|------|---------|
| `server/src/quests/NpcQuestTypes.ts` | Type definitions |
| `server/src/quests/NpcQuestService.ts` | Quest logic |
| `server/src/quests/npcQuestRoute.ts` | API endpoints |
| `server/src/tests/npc-quest-service.test.ts` | Unit tests |
| `server/src/routes/resourceGatherRoute.ts` | Quest progress on gather |
| `server/src/routes/craftingRoute.ts` | Quest progress on craft |
| `server/src/economy/economyRoute.ts` | Quest progress on sell |

### Client

| File | Purpose |
|------|---------|
| `apps/client-2d/src/ui/windows/NpcDialoguePanel.tsx` | NPC dialogue UI |
| `apps/client-2d/src/game/questActions.ts` | Client API actions |
| `apps/client-2d/src/game/liveGameplaySnapshot.ts` | Snapshot types |

## Verification

```bash
pnpm --filter @wasd/shared build
pnpm --filter @wasd/server exec tsc --noEmit
pnpm run guard:all
pnpm -r --if-present test
pnpm run ci:verify
pnpm run test:e2e:ci
```