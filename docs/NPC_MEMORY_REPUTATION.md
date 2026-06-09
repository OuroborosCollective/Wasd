# NPC Memory and Reputation System

> Documentation Date: 2026-06-09
> Branch: `feat/npc-memory-persistence-rumors`

## Overview

The NPC Memory and Reputation System provides deterministic, server-authoritative tracking of player-NPC relationships with persistent memory and social rumor propagation. It uses the Cyber-Zen design language from the Arelorian Stitch design system.

## Architecture

### Core Components

| Component | File | Purpose |
|-----------|------|---------|
| `NpcRumorTypes` | `server/src/npc/NpcRumorTypes.ts` | Type definitions for memory events, rumors, and persistence |
| `NpcMemoryStore` | `server/src/npc/NpcMemoryStore.ts` | JSON file-based persistence for NPC memory and rumors |
| `NpcMemoryService` | `server/src/npc/NpcMemoryService.ts` | Memory event recording and retrieval |
| `NpcRumorService` | `server/src/npc/NpcRumorService.ts` | Rumor creation and deterministic propagation |
| `NpcMemoryRoute` | `server/src/npc/NpcMemoryRoute.ts` | API routes for memory/rumor endpoints |

### Data Flow

```
Quest Complete (accept/complete)
  → NpcMemoryService.recordQuestCompleted()
    → Persisted to NpcMemoryStore (JSON file)
    → Triggers NpcRumorService.createRumorFromMemory()
      → Creates helped_village rumor for Mira
      → Rumor propagates to eligible NPCs (village_elder_001, outpost_guard_001)
        → Updates LiveGameplaySnapshot via composer
          → Client displays in NpcDialoguePanel
```

## Determinism Rules

- **No** `Date.now()` for gameplay state
- **No** `Math.random()` for gameplay IDs
- **No** UUID for memory event IDs - uses deterministic format: `${npcId}:${playerId}:${kind}:${logicalIndex}:${sourceId}`
- **No** client-authoritative memory writes
- **No** duplicate event application
- **No** partial mutation after failed persistence validation
- Stable sorting by `logicalIndex`, `eventId`

## Persistence Model

### PersistedNpcMemoryState

```typescript
interface PersistedNpcMemoryState {
  readonly schemaVersion: 1;
  readonly playerId: string;
  readonly npcId: string;
  readonly reputation: number;
  readonly trustTier: TrustTier;
  readonly completedQuestIds: readonly string[];
  readonly memoryEvents: readonly NpcMemoryEvent[];
  readonly knownRumorIds: readonly string[];
}
```

### NpcMemoryEvent

```typescript
interface NpcMemoryEvent {
  readonly eventId: string;  // Format: ${npcId}:${playerId}:${kind}:${logicalIndex}:${sourceId}
  readonly npcId: string;
  readonly playerId: string;
  readonly kind: "quest_accepted" | "quest_completed" | "sell_completed" | "trade_completed" | "gift_given" | "interaction_failed" | "hostile_action" | "rumor_heard";
  readonly logicalIndex: number;
  readonly sourceId: string;
  readonly reputationDelta: number;
  readonly note: string;
}
```

### Persistence Backend

Uses `NpcMemoryStore` with JSON file backend:
- File location: `process.cwd()/data/npc-memory.json` (configurable via `NPC_MEMORY_FILE` env var)
- Atomic writes via temp file + rename pattern
- Stable sort for deterministic output
- Corrupt JSON handling: returns empty state, doesn't crash server

## Trust Tiers

Trust tier is determined by reputation value and maps to visual states:

| Reputation | Tier | CSS Class | Visual |
|------------|------|-----------|--------|
| ≥ 5 | HONORED | `trust-tier--honored` | Violet glow, premium feel |
| ≥ 3 | TRUSTED | `trust-tier--trusted` | Green emphasis |
| ≥ 1 | NEUTRAL | `trust-tier--neutral` | Cyan standard |
| ≤ -1 | COLD | `trust-tier--cold` | Muted grey-blue |
| ≤ -3 | HOSTILE | `trust-tier--hostile` | Ruby/fire danger |

### Effective Trust Calculation

```
effectiveReputation = directReputation + Math.trunc(totalRumorWeight / 2)
```

Direct memory has strongest effect. Rumors contribute half their weight to effective reputation.

## Cyber-Zen Visual Source

The NPC Memory UI uses the existing Cyber-Zen design vocabulary from:

- `apps/client-2d/src/theme.css` - CSS variables and base tokens
- `apps/client-2d/src/ui/windows/NpcDialoguePanel.tsx` - Component implementation
- Pattern: dark radial cyber background, thin neon borders, monospace status labels, deterministic HUD panels

## Reused UI Components/Classes

### CSS Variables (from theme.css)

| Variable | Value | Usage |
|----------|-------|-------|
| `--cz-bg` | `#05060b` | Base background |
| `--cz-panel` | `rgba(13, 17, 28, 0.86)` | Panel background |
| `--cz-cyan` / `--st-aether` | `#00e5ff` | Cyan accent, trust tier neutral |
| `--cz-green` / `--st-emerald` | `#39ff14` | Green accent, completed states |
| `--cz-gold` / `--st-gold` | `#ffd76a` | Gold accent, dialogue state |
| `--st-ruby` | `#ff3f6f` | Ruby accent, hostile state |
| `--st-violet` | `#8b5cf6` | Violet accent, honored state |

### Component Classes

| Class | Purpose |
|-------|---------|
| `.cz-npc-panel` | Main NPC dialogue panel container |
| `.cz-npc-memory` | NPC memory block with header |
| `.cz-npc-memory-header` | Memory block header with sigil |
| `.cz-npc-identity` | NPC name and trust tier row |
| `.cz-npc-name` | NPC display name text |
| `.cz-trust-badge` | Trust tier badge (honored/trusted/neutral/cold/hostile) |
| `.cz-npc-rep-row` | Reputation row with label and value |
| `.cz-npc-rep-value` | Reputation number display |
| `.cz-npc-memory-note` | Deterministic memory/lore text |
| `.cz-npc-dialogue-state` | Dialogue state indicator row |
| `.cz-npc-line` | NPC dialogue text |
| `.cz-quest-tracker` | Quest tracker container |
| `.cz-quest-objectives` | Quest objectives list |
| `.cz-quest-objective` | Individual quest objective |
| `.cz-action-btn` | Action buttons (accept/complete/talk) |

## Trust Tiers

Trust tier is determined by reputation value and maps to visual states:

| Reputation | Tier | CSS Class | Visual |
|------------|------|-----------|--------|
| ≥ 5 | HONORED | `trust-tier--honored` | Violet glow, premium feel |
| ≥ 3 | TRUSTED | `trust-tier--trusted` | Green emphasis |
| ≥ 1 | NEUTRAL | `trust-tier--neutral` | Cyan standard |
| ≤ -1 | COLD | `trust-tier--cold` | Muted grey-blue |
| ≤ -3 | HOSTILE | `trust-tier--hostile` | Ruby/fire danger |

## Memory Notes

Memory notes are deterministic based on dialogue state:

| Dialogue State | Memory Note |
|----------------|-------------|
| `quest_completed` | "VERIFIED TRUSTWORTHY // MEMORY LOCKED" |
| `quest_ready_to_complete` | "AWAITING COMPLETION // SUPPLY READY" |
| `quest_active_ready_to_sell` | "PROCESSING ACTIVE // PLANK PENDING" |
| `quest_active_ready_to_process` | "GATHERING COMPLETE // PROCESSING NEEDED" |
| `quest_active_missing_wood` | "ORDER PENDING // WOOD NEEDED" |
| `quest_available` | "TRADE ACTIVE // OPEN TO BUSINESS" |

## Test IDs

| Test ID | Element |
|---------|---------|
| `npc-dialogue-village_trader_001` | Main NPC dialogue panel |
| `npc-memory-village_trader_001` | NPC memory block |
| `npc-trust-tier-village_trader_001` | Trust tier badge |
| `npc-reputation-village_trader_001` | Reputation value display |
| `npc-memory-note-village_trader_001` | Memory/lore text |
| `npc-dialogue-memory-state-village_trader_001` | Dialogue state indicator |
| `npc-dialogue-line-village_trader_001` | NPC dialogue text |
| `npc-name-village_trader_001` | NPC name display |
| `quest-tracker-village_supply_order_001` | Quest tracker |
| `quest-objective-{objectiveId}` | Quest objective item |
| `quest-reward-village_supply_order_001` | Reward preview |
| `accept-quest-village_supply_order_001` | Accept quest button |
| `complete-quest-village_supply_order_001` | Complete quest button |

## Where the Panel Appears

The NPC Dialogue Panel appears in the `/2d` path when:

1. Player is near Mira the Quartermaster (`village_trader_001` at position 462, 503)
2. Player interacts with the NPC (triggers `/api/npc/talk`)
3. The panel is displayed in the `GameplayWindowsLayer` component

The panel uses the same z-index and positioning as other gameplay windows (z-index 70, fixed top-right).

## Data Source

All NPC memory and reputation values come from `LiveGameplaySnapshot`:

```typescript
interface NpcReputationSnapshot {
  readonly npcId: string;
  readonly playerId: string;
  readonly reputation: number;
  readonly completedQuestIds: readonly string[];
}

interface NpcDialogueSnapshot {
  readonly npcId: string;
  readonly displayName: string;
  readonly dialogueState: string;
  readonly line: string;
  readonly availableQuestIds: readonly string[];
  readonly activeQuestIds: readonly string[];
  readonly completedQuestIds: readonly string[];
}
```

## Implementation Files

| File | Purpose |
|------|---------|
| `apps/client-2d/src/ui/windows/NpcDialoguePanel.tsx` | React component with Cyber-Zen styling |
| `apps/client-2d/src/theme.css` | Cyber-Zen CSS tokens and component styles |
| `apps/client-2d/src/game/liveGameplaySnapshot.ts` | Client-side snapshot types |
| `server/src/quests/NpcQuestService.ts` | Server-side NPC quest and reputation service |
| `server/src/gameplay/composeLiveGameplaySnapshotFromLegacy.ts` | Snapshot composition with NPC data |

## Determinism Rules

- **No** `Math.random()` for trust tier determination
- **No** `Date.now()` for memory note generation
- **No** random decorative text
- **No** fake data
- Memory notes derived deterministically from `dialogueState` and `completedQuestIds`
- Trust tier derived deterministically from `reputation` value