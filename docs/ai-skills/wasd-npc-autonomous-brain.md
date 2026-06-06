# WASD NPC Autonomous Brain System

## Overview

The NPC Autonomous Brain System is a deterministic, replay-capable memory and decision system for NPCs in the Ouroboros game world. It provides:

- **5-Layer Memory Model**: Identity, Episodic, Semantic, Relations, Learning
- **World Event Observation Bus**: All game systems can emit events for NPCs to observe
- **Deterministic Decision Engine**: Same tick + same input = same output (no Math.random())
- **Tick-Based Scheduling**: 10Hz movement, 1Hz decisions, 0.1Hz memory compression
- **Memory Compression**: Prevents unbounded memory growth
- **Debug Snapshot Support**: For replay verification and admin HUD

## Architecture

```
NPCBrainRunner
├── NPCMemoryV3 (Memory types)
├── NPCObservationBus (World events)
├── NPCMemoryScoring (Importance calculation)
├── NPCDecisionEngine (Action selection)
├── NPCBrainScheduler (Tick phases)
├── NPCMemoryCompression (State management)
└── NPCBrainDebugSnapshot (Debug support)
```

## Memory Layers

### 1. Identity Memory
Who am I? (profession, role, personality, home region)

### 2. Episodic Memory
Concrete events: "Player X attacked me at tick 91240"

### 3. Semantic Memory
Verdichtetes Wissen: "Player X is dangerous" / "Region Y has little iron"

### 4. Relations
Trust, fear, respect, morale toward entities

### 5. Learning State
Statistical experience tracking for action success

## Key Files

| File | Purpose |
|------|---------|
| `NPCMemoryV3.ts` | Type definitions and memory creation |
| `NPCObservationBus.ts` | World event emission and subscription |
| `NPCMemoryScoring.ts` | Memory importance calculation |
| `NPCDecisionEngine.ts` | Deterministic action selection |
| `NPCBrainScheduler.ts` | Tick-based phase management |
| `NPCMemoryCompression.ts` | Memory summarization |
| `NPCBrainDebugSnapshot.ts` | Debug and replay support |
| `NPCBrainRunner.ts` | Main integration loop |

## Usage

### Creating NPC Memory

```typescript
import { createEmptyNPCMemoryV3 } from "./modules/npc/brain/index.js";

const memory = createEmptyNPCMemoryV3(
  "npc_1",
  "Bob the Merchant",
  "region_capital",
  "merchant",
  "trader"
);
```

### Emitting World Events

```typescript
import { globalObservationBus, emitCombatEvent } from "./modules/npc/brain/index.js";

// Simple event
globalObservationBus.emit("player_attack", tick, {
  actorId: "player_1",
  targetId: "npc_1",
  impact: -8,
  tags: ["combat", "danger"],
});

// Combat event helper
emitCombatEvent(globalObservationBus, tick, "player_attack", {
  actorId: "player_1",
  targetId: "npc_1",
  damage: 25,
  weaponType: "sword",
});
```

### Running NPC Brain

```typescript
import { NPCBrainRunner } from "./modules/npc/brain/index.js";

const runner = new NPCBrainRunner();

const output = runner.runWithContext({
  npcId: "npc_1",
  npcName: "Bob",
  position: { x: 100, y: 200 },
  homeRegionId: "region_capital",
  state: "idle",
  health: 0.8,
  energy: 0.7,
  gold: 50,
  memory,
  nearbyEntities: [
    { id: "player_1", name: "Hero", type: "player", position: { x: 105, y: 205 }, hostile: true },
  ],
  tick: 1000,
  worldSnapshot: {
    tick: 1000,
    regionId: "region_capital",
    timeOfDay: 12,
    dangerLevel: 0.2,
    resourceAvailability: {},
    marketPrices: { iron: 30, wood: 15 },
    nearbyThreats: [],
    friendlyNPCs: [],
    hostileNPCs: [],
  },
});

console.log(`Decision: ${output.decision.action}`);
console.log(`Next State: ${output.nextState}`);
console.log(`Memory Hash: ${output.memoryHash}`);
```

## Ouroboros Integration

The NPC Brain is integrated into `OuroborosEngine`:

```typescript
import { OuroborosEngine } from "./modules/ouroboros/OuroborosEngine.js";

const engine = new OuroborosEngine({
  enableNPCBrain: true,
  npcBrainInterval: 10, // 1 Hz
});

// In WorldTick:
engine.tick(tickCount, npcs, players, memoryCache, relationships, ...);

// Get NPC memory for debugging
const memory = engine.getNPCMemory("npc_1");
```

## Decision Actions

| Action | Description |
|--------|-------------|
| `idle` | No action |
| `talk` | Social interaction |
| `trade` | Buy/sell goods |
| `flee` | Escape from threat |
| `attack` | Engage enemy |
| `patrol` | Guard duty |
| `work` | Labor activity |
| `gather` | Collect resources |
| `craft` | Create items |
| `explore` | Discover area |
| `defend` | Protect others |
| `raise_alarm` | Alert others |
| `hire_guard` | Employ protection |
| `social` | Interact with NPCs |

## Brain Phases

| Phase | Frequency | Operations |
|-------|-----------|------------|
| TICK | 10 Hz | Movement, danger check |
| DECISION | 1 Hz | Decision, goal scoring |
| PLANNING | 0.1 Hz | Memory compression, routine planning |

## Determinism

All decisions use stable hash distribution:
- `stableHash32()` for deterministic randomness
- Same NPC always runs brain at same tick offsets
- Memory hash enables replay verification

## Debug HUD

```typescript
import { createNPCBrainDebugSnapshot, checkBrainHealth } from "./modules/npc/brain/index.js";

const snapshot = createNPCBrainDebugSnapshot(
  npcId, tick, state, memory, decision
);

const health = checkBrainHealth(memory, tick);
console.log(`NPC Health: ${health.score}/100`);
```

## Testing

Run tests:
```bash
npx vitest run server/src/tests/npc-autonomous-brain.test.ts
```

Tests verify:
- Memory creation and migration
- Observation bus functionality
- Memory scoring determinism
- Decision engine determinism
- Brain scheduler tick distribution
- Memory compression
- Replay verification

## Related Skills

- `wasd-ouroboros-system.md` - Ouroboros engine overview
- `wasd-server-player-stats-sync.md` - Player stats integration