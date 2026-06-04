# ARE Logic Core ⚙️

Tags: `are`, `determinism`, `axioms`, `world-model`, `research`
Status: `research-backed-design`

```
╭──────────────────────────────────────────────────────────────────────╮
│                                                                      │
│   ████████╗██╗  ██╗██╗   ██╗████████╗███████╗ ██████╗ █████╗ ██████╗ │
│   ╚══██╔══╝██║  ██║██║   ██║╚══██╔══╝██╔════╝██╔════╝██╔══██╗██╔══██╗│
│      ██║   ███████║██║   ██║   ██║   █████╗  ╚█████╗ ███████║██████╔╝│
│      ██║   ██╔══██║██║   ██║   ██║   ██╔══╝   ╚═══██╗██╔══██║██╔═══╝ │
│      ██║   ██║  ██║╚██████╔╝   ██║   ███████╗██████╔╝██║  ██║██║     │
│      ╚═╝   ╚═╝  ╚═╝ ╚═════╝    ╚═╝   ╚══════╝╚═════╝ ╚═╝  ╚═╝╚═╝     │
│                                                                      │
│   AUTHENTIC REALITY EMANCIPATION — DETERMINISTIC WORLD MODEL          │
╰──────────────────────────────────────────────────────────────────────╯
```

---

## The Five Axioms of ARE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   AXIOM I        AXIOM II        AXIOM III       AXIOM IV      AXIOM V   │
│   ────────       ────────        ────────         ────────      ────────   │
│                                                                             │
│   ◈ FIELD ◈     ◈ EMERGE ◈     ◈ PERSIST ◈    ◈ OUROBOROS◈   ◈ OBSERVE◈ │
│                                                                             │
│   Information     Emergence     Persistence    Cycle Loop    Observer      │
│   Every entity   Complexity     Truth through  Input→Sim→  Player/NPC   │
│   is a node      from simple   replayable    Memory→Future collapses     │
│   in the world   rules         seeds & hashes              potential     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Axiom Breakdown

| Axiom | Icon | Core Principle | Engine Meaning |
|-------|------|----------------|----------------|
| **I** | ◈ Field | Information as primary substance | World state as data structures |
| **II** | ◈ Emerge | Complexity from simplicity | Simple rules → rich behavior |
| **III** | ◈ Persist | Truth survives replay | Seeds, hashes, deterministic RNG |
| **IV** | ◈ Ouroboros | Closed causal loop | WorldTick cycle, memory → future |
| **V** | ◈ Observe | Observer creates reality | Focus = simulation priority |

---

## Implementation Map

```
Theory                          Engine
═══════════════════════════════════════════════════════════════════════════

┌─────────────────┐             ┌─────────────────────────────┐
│  INFORMATION     │─────────────▶│  WorldState per tick        │
│  FIELD          │             │  server/src/core/          │
└─────────────────┘             └─────────────────────────────┘

┌─────────────────┐             ┌─────────────────────────────┐
│  EMERGENCE      │─────────────▶│  NPC Autonomy              │
│                 │             │  server/src/modules/npc/   │
└─────────────────┘             └─────────────────────────────┘

┌─────────────────┐             ┌─────────────────────────────┐
│  PERSISTENCE    │─────────────▶│  AREClock + ARERng       │
│                 │             │  server/src/core/ARE*.ts    │
└─────────────────┘             └─────────────────────────────┘

┌─────────────────┐             ┌─────────────────────────────┐
│  OUROBOROS      │─────────────▶│  WorldTick Loop           │
│  CYCLE          │             │  server/src/core/WorldTick.ts │
└─────────────────┘             └─────────────────────────────┘

┌─────────────────┐             ┌─────────────────────────────┐
│  OBSERVER        │─────────────▶│  Chunk Observation         │
│                 │             │  server/src/core/chunk/    │
└─────────────────┘             └─────────────────────────────┘
```

---

## Key Implementation Files

```bash
server/src/core/
├── WorldTick.ts          # 10Hz simulation heartbeat
├── AREClock.ts          # Deterministic time source
├── ARERng.ts            # Seeded random number generator
├── AREDeterminism.ts    # Determinism gate & validators
└── manifest/            # State hash chain
    ├── ManifestFactory.ts
    ├── ManifestHasher.ts
    └── ManifestSigner.ts
```

---

## Research Status

| Aspect | Status | Notes |
|--------|--------|-------|
| ARE Clock | 🟢 LIVE | Implemented in `AREClock.ts` |
| ARE RNG | 🟢 LIVE | Implemented in `ARERng.ts` |
| Determinism Gate | 🟢 LIVE | `AREDeterminism.ts` blocks non-determinism |
| Ouroboros Loop | 🟡 BETA | Core loop exists, expansion planned |
| Observer Model | 🔵 PLANNED | Chunk-based observation designed |

---

## Design Philosophy

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│   "ARE defines reality as a field of information that becomes concrete           │
│    inside deterministic simulation windows."                                   │
│                                                                               │
│   Practical Engine Rules:                                                     │
│                                                                               │
│   ✓ Stable tick boundaries (100ms / 10Hz)                                    │
│   ✓ Integer-scaled coordinates (Kappa system)                                │
│   ✓ Replayable outcomes (seeded RNG)                                         │
│   ✓ No hidden random mutation (determinism gate)                             │
│   ✓ Clear links: Theory → Implementation                                     │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## See Also

- [[Home]]
- [[Glossary]]
- [[ARE-Erdos Attractor Model|ARE-Erdos-Attractor-Model]] — Kappa coordinates & Erdős distance
- [[WorldTick and 10Hz Simulation|WorldTick-and-10Hz-Simulation]] — Tick loop
- [[Determinism]] — Deterministic simulation rules
- [[Implementation Map|Implementation-Map]] — Full code mapping