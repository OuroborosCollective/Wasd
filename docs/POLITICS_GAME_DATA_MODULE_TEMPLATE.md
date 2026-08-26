# Politics Game-Data → Module Pattern

This is the reference pattern for connecting shared `game-data` content with server runtime modules.

## Rule

`game-data` owns content and balancing values.

`server/src/modules` owns runtime logic, validation, deterministic decisions and integration with the authoritative server.

Clients may read or receive derived politics data for UI, but the server remains authoritative.

## Current politics example

```txt
/game-data/politics/government-types.json
/game-data/politics/diplomacy-types.json
        ↓
server/src/modules/content/contentDataRoot.ts
        ↓
server/src/modules/politics/PoliticsDataRegistry.ts
        ↓
server/src/modules/politics/GovernmentTypes.ts
server/src/modules/politics/DiplomacyTypes.ts
        ↓
PoliticsSystem / NPC / factions / settlement logic
        ↓
2D and 3D clients receive snapshots or UI-safe projections
```

## What belongs in game-data

Use `game-data/politics/*.json` for values that designers, tools, 2D, 3D and server should agree on:

- government ids
- labels
- succession modes
- base stability
- election cycle ticks
- diplomacy modifiers
- civic rights
- trade and war bias values
- default treaty durations

## What belongs in modules

Use `server/src/modules/politics/*` for actual runtime behavior:

- loading and normalizing data
- rejecting malformed definitions
- deterministic scoring
- applying effects to factions, towns, NPCs or kingdoms
- emitting authoritative events
- producing snapshots for clients

## What must not happen

Do not duplicate the same political facts in both places.

Bad:

```ts
export const GovernmentTypes = {
  monarchy: { id: "monarchy", stabilityBase: 0.7 }
};
```

while also keeping different values in:

```txt
game-data/politics/government-types.json
```

That creates two truths.

Good:

```ts
export const GovernmentTypes = getGovernmentTypes();
```

where `getGovernmentTypes()` loads, validates and freezes the JSON from `game-data`.

## Why this matters

This keeps 2D, 3D, editor tools and server logic aligned without making the client authoritative.

The client can display government and diplomacy information. The server decides what actually happens.

## Determinism notes

Politics data must not depend on wall-clock time, random values or external services.

Use tick-based values such as:

```json
{
  "electionCycleTicks": 72000,
  "defaultDurationTicks": 108000
}
```

Avoid:

```json
{
  "durationMsFromNow": 86400000
}
```

The runtime may convert ticks to UI text later, but the simulation truth stays tick-based.
