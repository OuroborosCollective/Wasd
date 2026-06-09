# NPC Rumor Network

> Documentation Date: 2026-06-09
> Branch: `feat/npc-memory-persistence-rumors`

## Overview

The NPC Rumor Network provides deterministic social memory propagation between NPCs. When significant events occur, rumors are created and can spread to eligible NPCs within the village social network.

## Rumor Kinds

| Kind | Weight | Trigger | Visual |
|------|--------|---------|--------|
| `helped_village` | +2 | Quest completed for Mira | Cyan accent |
| `reliable_supplier` | +2 | 5 sell_completed milestones | Green accent |
| `trusted_worker` | +3 | Trust tier "honored" with Mira | Violet accent |
| `troublemaker` | -1 | 3+ interaction_failed events | Gold/muted warning |
| `hostile_actor` | -2 | Hostile action recorded | Ruby/fire danger |

## Rumor ID Format

Rumor IDs are deterministic:
```
${sourceNpcId}:${playerId}:${sourceEventId}:rumor
```

Example: `village_trader_001:player123:village_trader_001:player123:quest_completed:0:village_supply_order_001:rumor`

## Propagation Rules

Rumor propagation is **deterministic** and **idempotent**:

1. **Same Settlement**: NPCs within 80 units of village center (462, 503) are eligible
2. **Social Edges**: NPCs linked via `socialLinks` property in NPC definition
3. **Vendor/Quest NPCs**: Any vendor or quest NPC within 100 units of village center

### Initial NPC Set

| NPC ID | Name | Position | Social Links |
|--------|------|----------|--------------|
| `village_trader_001` | Mira the Quartermaster | 462, 503 | `village_elder_001`, `outpost_guard_001` |
| `village_elder_001` | Elder Thorne | 458, 498 | `village_trader_001`, `outpost_guard_001` |
| `outpost_guard_001` | Captain Roderick | 520, 510 | `village_trader_001`, `village_elder_001` |

## Rumor Consequences

### Direct Memory vs Rumor Memory

- **Direct Memory**: Always has strongest effect
- **Rumor Memory**: Weaker than direct memory
- **Rumor Effect**: Adjusts dialogue tone, does not grant rewards

### Effective Trust Calculation

```typescript
effectiveReputation = directReputation + Math.trunc(totalRumorWeight / 2)
```

### Example Scenario

1. Player completes Mira's quest
   - Memory event recorded: `quest_completed`
   - Reputation +1 (direct)
   - `helped_village` rumor created

2. Rumor propagates to village_elder_001 and outpost_guard_001
   - Each receives `rumor_heard` memory event
   - Rumor weight contributes to effective trust

3. Player's effective trust with Elder Thorne:
   - Direct: 0
   - Rumor bonus: +1 (rumor weight 2 / 2)
   - Effective: 1 (NEUTRAL)

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/npc/memory` | GET | Get all memory snapshots for player |
| `/api/npc/memory/:npcId` | GET | Get memory snapshot for specific NPC |
| `/api/npc/reputation` | GET | Get NPC reputation with rumor influence |
| `/api/npc/rumors` | GET | Get all rumors for player or specific NPC |
| `/api/npc/rumors/propagate` | POST | Trigger rumor propagation (idempotent) |
| `/api/npc/effective-trust/:npcId` | GET | Get effective trust calculation |
| `/api/npc/rumor-eligible/:sourceNpcId` | GET | Get eligible rumor targets |

## Fail Reasons

| Reason | Description |
|--------|-------------|
| `missing_player` | Player ID not provided |
| `missing_npc` | NPC ID not provided or not found |
| `missing_rumor` | Rumor ID not provided or not found |
| `invalid_rumor_kind` | Rumor kind not recognized |
| `duplicate_rumor` | Rumor already exists (idempotent check) |
| `duplicate_memory_event` | Memory event already recorded |
| `invalid_logical_index` | Logical index out of valid range |
| `rumor_propagation_rejected` | Propagation blocked by eligibility rules |
| `persistence_load_failed` | Failed to load from store |
| `persistence_save_failed` | Failed to save to store |

## Snapshot Types

### NpcMemorySnapshot

```typescript
interface NpcMemorySnapshot {
  readonly npcId: string;
  readonly playerId: string;
  readonly reputation: number;
  readonly trustTier: TrustTier;
  readonly memoryEventCount: number;
  readonly recentMemoryNotes: readonly string[];
  readonly knownRumorCount: number;
}
```

### NpcRumorSnapshot

```typescript
interface NpcRumorSnapshot {
  readonly rumorId: string;
  readonly npcId: string;
  readonly playerId: string;
  readonly kind: NpcRumorKind;
  readonly weight: number;
  readonly note: string;
  readonly sourceNpcId: string;
}
```

## Cyber-Zen UI Mapping

| Rumor Kind | CSS Class | Color Accent |
|-------------|-----------|--------------|
| `helped_village` | `rumor-badge--positive` | Cyan |
| `reliable_supplier` | `rumor-badge--green` | Green |
| `trusted_worker` | `rumor-badge--violet` | Violet |
| `troublemaker` | `rumor-badge--warning` | Gold |
| `hostile_actor` | `rumor-badge--danger` | Ruby |

## Test IDs

| Test ID | Element |
|---------|---------|
| `npc-memory-village_trader_001` | Direct memory section |
| `npc-rumors-village_trader_001` | Rumors heard section |
| `npc-rumor-count-village_trader_001` | Rumor count badge |
| `npc-rumor-helped_village` | helped_village rumor item |
| `npc-rumor-reliable_supplier` | reliable_supplier rumor item |
| `npc-effective-trust-village_trader_001` | Effective trust section |
| `npc-memory-persisted-village_trader_001` | Memory persistence indicator |

## Known Limitations

1. **No autonomous AI brain** - This step implements deterministic memory, not autonomous NPC decision-making
2. **No parallel quest system** - Uses existing NpcQuestService integration
3. **No random rumor spread** - All propagation is explicit and deterministic
4. **Wall-clock timestamps not used** - Uses `logicalIndex` for event ordering