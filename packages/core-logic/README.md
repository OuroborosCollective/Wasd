# Build Immortal Worlds with Ouroboros ARE.

Ouroboros ARE turns game logic into a living, replayable, cheat-resistant causality engine. It is built for developers who want their worlds to feel inevitable: every card move, combat hit, economy pulse and healing event can be reproduced, inspected and replayed.

This is not just a math library. It is a God-Mode developer experience for Replit, browser games and multiplayer simulations.

## Core Features

### Cheat-Proof Physics
Every state transition is derived from an ARE seed, a fixed kappa invariant and the WorldHash. No hidden dice. No mystery server ghosts. If two peers run the same input stream, they arrive at the same result.

### Time-Travel Debugging
The Recorder pattern lets you inspect the last frames of causality like a timeline. Scrub backward, inspect a WorldHash, compare entities, and find exactly where the world bent.

### Infinite Scalability
ARE is designed around observation. Simulate what matters, hash what changes, and keep the core logic portable enough to run in servers, demos, SDK examples and tiny Replit previews.

### Cyber-Zen Visual Feedback
Use `OuroborosPulseView` to show the 10-Hz heartbeat. When the WorldHash advances, the Marina Blue aura pulses. Users instantly see the engine breathe.

## Quick Start: First TCG Move in 3 Lines

```ts
import { quickStartTCGMove } from "../sdk-examples/TCGExample";
const frame = await quickStartTCGMove("ARE|my-first-world");
console.log(frame.worldHash, frame.score);
```

## Starter Templates

### TCG Logic
`packages/sdk-examples/TCGExample.ts` contains a deterministic 3x3 card board. Cards trigger effects from the WorldHash, never from random values.

```ts
import { createTCGDeck, applyTCGMove } from "../sdk-examples/TCGExample";

const seed = "ARE|tcg|alpha";
const deck = await createTCGDeck(seed);
const frame = await applyTCGMove(seed, 1, deck, { cardId: "alpha-card-0", x: 1, y: 1 });
console.log(frame.events);
```

### Autobattler Core
`packages/sdk-examples/BattleSim.ts` runs two deterministic unit teams against each other. The `getReplayData()` function exposes frame-by-frame replay data.

```ts
import { BattleSim } from "../sdk-examples/BattleSim";

const sim = new BattleSim("ARE|battle|demo");
await sim.run(60);
console.table(sim.getReplayData().map((frame) => ({ tick: frame.tick, hash: frame.worldHash.slice(0, 8), winner: frame.winner })));
```

## React Pulse View

```tsx
import { OuroborosPulseView } from "@wasd/core-logic/react/OuroborosPulseView";

<OuroborosPulseView
  frames={battleFrames.map((frame) => ({ tick: frame.tick, worldHash: frame.worldHash }))}
/>
```

## Emily Oracle Guard

The AREInvariantGuard is intentionally strict in the examples. If someone tries to sneak `Math.random()` or `Date.now()` into the ARE core logic or SDK examples, Emily speaks up:

```text
Emily Oracle Warning: forbidden nondeterminism detected inside the ARE demo.
```

That warning is not decoration. It is a design promise: the world must be explainable.

## Replit Experience

Press Run and the boot script starts:

- the game server on port `3001`
- the Cyber-Zen SDK visual demo on port `5173`
- Emily's welcome message in the console

```text
Emily: Willkommen, Replit-Architekt. Engine Online. Kausalität stabil.
```

The preview shows:

```text
Engine Online. Kausalität stabil.
```

Then the Autobattler begins breathing through the 10-Hz pulse view.

## Philosophy

Immortal worlds are not worlds that never fail. They are worlds that remember, explain, rewind and heal.

Ouroboros ARE is the causal spine for that kind of game.
