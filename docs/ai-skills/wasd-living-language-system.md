# Living Language System - Skills, Tools, and Best Practices

## Overview

The Living Language System (LLS) is an autonomous NPC speech generation system that provides deterministic, server-authoritative dialogue generation without LLM calls. It integrates with the ARE (Autonomous Reactive Engine) tick loop and communicates with clients via WebSocket events.

## Architecture Components

### 1. DialogueBridge (`server/src/core/language/DialogueBridge.ts`)
**Purpose**: Bridge between Living Language System and existing `dialogues.json` content.

**Key Functions**:
- `initializeDialogueBridge(dialogues)` - Load dialogues from game-data
- `resolveDialogue(dialogueId, context)` - Resolve dialogue with quest context
- `getDialogueEntry(dialogueId)` - Get raw dialogue entry
- `getFallbackText(dialogueId)` - Get fallback text

**Usage**:
```typescript
import { initializeDialogueBridge, resolveDialogue } from './language/index.ts';

const dialogues = JSON.parse(fs.readFileSync('game-data/dialogue/dialogues.json'));
initializeDialogueBridge(dialogues);

const result = resolveDialogue('dialogue_npc_1', {
  questId: 'quest_1',
  questPhase: 'start'
});
```

### 2. DialogueDecisionKernel (`server/src/core/language/DialogueDecisionKernel.ts`)
**Purpose**: Meaning-first NPC intent selection based on internal state (hunger, trust, fear, duty).

**Key Functions**:
- `decideUtterance(context)` - Decide what NPC should say
- `registerPhraseGenome(genome)` - Register phrase patterns
- `clearKernelState(npcId)` - Clear state for testing

**Decision Context**:
```typescript
interface DecisionContext {
  npcState: NpcLanguageState;  // NPC emotional/relationship state
  worldState: WorldState;       // World threat/safety context
  tick: number;                // Deterministic tick
  sequenceId: number;           // Utterance sequence
}
```

### 3. ArelorianLinguisticKernel (`server/src/core/language/ArelorianLinguisticKernel.ts`)
**Purpose**: Language system integration with main tick loop. Runs every 10 ticks.

**Key Functions**:
- `processLinguisticUpdate(tick, npcStates, worldState)` - Main processing
- `buildNpcLanguageState(npcId, worldState)` - Build NPC language state
- `initializeLinguisticKernel()` - Initialize at startup

### 4. LivingLanguageChatBridge (`server/src/core/language/LivingLanguageChatBridge.ts`)
**Purpose**: Emit `npc_dialogue` events via WebSocket for 2D client.

**Key Functions**:
- `emitNpcDialogueEvents(utterances, npcIdToName, tick)` - Emit to clients

**Event Payload**:
```typescript
{
  type: 'npc_dialogue',
  npcId: string,
  npcName: string,
  text: string,
  intent: string,
  tick: number
}
```

## Integration Points

### Server Bootstrap Integration
Add to `server/src/core/ServerBootstrap.ts`:
```typescript
import { initializeLivingLanguageSystem } from './language/LivingLanguageInitializer.js';

// After tick.init()
await initializeLivingLanguageSystem();
```

### ArelorianKernel Tick Integration
Add to `server/src/core/systems/ArelorianKernel.ts`:
```typescript
import { processLinguisticUpdate, buildNpcLanguageState } from '../language/ArelorianLinguisticKernel.js';
import { emitNpcDialogueEvents } from '../language/LivingLanguageChatBridge.js';

// In tick() method - every 10 ticks
if (this.tickCount % BigInt(10) === BigInt(0)) {
  await this.processLinguisticTick();
}

// New method
private async processLinguisticTick(): Promise<void> {
  const npcStates = this.buildNpcLanguageStates();
  const worldState = { /* world context */ };
  const utterances = processLinguisticUpdate(this.tickCount, npcStates, worldState);
  emitNpcDialogueEvents(utterances, this.buildNpcIdToNameMap(), Number(this.tickCount));
}
```

## ARE Determinism Requirements

The LLS follows strict determinism rules:

### HARD CONSTRAINTS
- ❌ NO `Date.now()`, `new Date()`
- ❌ NO `Math.random()`
- ❌ NO `crypto.randomUUID()`
- ✅ All decisions derive from stable hashes of state

### Deterministic Hash Pattern
```typescript
import { stableHash32 } from '../determinism/AREDeterminism.js';

function deterministicHash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
```

### Verification
Run the determinism check script:
```bash
node scripts/check-are-determinism.mjs
```

## NPC Language State

Build NPC state for linguistic processing:
```typescript
const npcState = buildNpcLanguageState(npc.id, {
  factionId: npc.faction ?? 'neutral',
  role: npc.role ?? 'citizen',
  hunger: 0.3,
  trust: 0.5,
  fear: 0.2,
  duty: 0.6,
  pride: 0.4,
  revenge: 0.1,
});
```

## Intent System

LLS supports multiple speech intents:
- `greet` - Friendly greeting
- `request` - Asking for help
- `warn` - Warning about danger
- `threaten` - Aggressive warning
- `thank` - Expressing gratitude
- `trade` - Trading conversation
- `rumor_share` - Sharing gossip
- `comfort` - Comforting player
- `teach` - Teaching knowledge
- `recruit` - Recruiting for faction
- `boast` - Prideful speech
- `farewell` - Saying goodbye

## Best Practices

### 1. Always Initialize Before Use
```typescript
await initializeLinguisticKernel();
await initializeDialogueBridge(dialogues);
```

### 2. Clean Up Between Tests
```typescript
clearDialogueBridge();
clearAllKernelState();
resetLinguisticKernel();
```

### 3. Use Interval Ticks
```typescript
// Only processes every 10 ticks by default
const utterances = processLinguisticUpdate(BigInt(tick), npcStates, worldState);

// Or force all NPCs
const all = processLinguisticUpdate(BigInt(tick), npcStates, worldState, { forceAll: true });
```

### 4. Handle Missing NPCs Gracefully
```typescript
for (const npc of npcs) {
  try {
    const state = buildNpcLanguageState(npc.id, {...});
    states.push(state);
  } catch {
    // Skip NPCs that fail
  }
}
```

### 5. Queue Events When WebSocket Unavailable
The `LivingLanguageChatBridge` automatically queues events when WebSocket is unavailable and flushes when available.

## Testing (No-Mock Rule)

All tests must use real functions:
```typescript
// ✅ CORRECT - Real function
const decision = decideUtterance(context);
expect(decision.constructedText).toBeTruthy();

// ❌ WRONG - Mocking
vi.mock('./DialogueDecisionKernel');
```

## Related Documentation

- `docs/ai-skills/wasd-are-system.md` - ARE engine types and integrations
- `docs/ai-skills/wasd-npc-autonomous-brain.md` - NPC autonomous brain system
- `server/src/core/language/README.md` - Language system architecture
