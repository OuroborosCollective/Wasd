# Areloria Codex Engine 🐉

> **The Living Knowledge Base of a Deterministic World**

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║     ███████╗██╗  ██╗██╗   ██╗████████╗██████╗  ██████╗ ██████╗ ███████╗   ║
║     ██╔════╝██║ ██╔╝██║   ██║╚══██╔══╝██╔══██╗██╔═══██╗██╔══██╗██╔════╝   ║
║     ███████╗█████╔╝ ██║   ██║   ██║   ██████╔╝██║   ██║██║  ██║███████╗   ║
║     ╚════██║██╔═██╗ ██║   ██║   ██║   ██╔══██╗██║   ██║██║  ██║╚════██║   ║
║     ███████║██║  ██╗╚██████╔╝   ██║   ██║  ██║╚██████╔╝██████╔╝███████║   ║
║     ╚══════╝╚═╝  ╚═╝ ╚═════╝    ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝   ║
║                                                                              ║
║                        CODEX ENGINE — v1.0.0                                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## The Five Pillars of Knowledge

```
                    ┌─────────────────────────────────────┐
                    │      AUTHENTIC REALITY EMANCIPATION   │
                    │            (ARE LOGIC CORE)          │
                    └──────────────────┬──────────────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           │                           │                           │
           ▼                           ▼                           ▼
    ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
    │  ERDOS      │           │  WORLD TICK │           │   NPC CORE  │
    │  ATTRACTOR  │           │   10Hz SIM  │           │  AUTONOMY   │
    └─────────────┘           └─────────────┘           └─────────────┘
           │                           │                           │
           └───────────────────────────┼───────────────────────────┘
                                       │
                    ┌─────────────────┴─────────────────┐
                    │      IMPLEMENTATION MAP          │
                    │   (From Theory to Code)        │
                    └─────────────────────────────────┘
```

---

## Core Systems Architecture

### 🔮 Deterministic Engine

| System | File | Status | Purpose |
|--------|------|--------|---------|
| `WorldTick` | `server/src/core/WorldTick.ts` | 🟢 Live | 10Hz simulation heartbeat |
| `AREClock` | `server/src/core/AREClock.ts` | 🟢 Live | Deterministic time |
| `ARERng` | `server/src/core/ARERng.ts` | 🟢 Live | Seeded randomness |
| `Manifest` | `server/src/core/manifest/` | 🟢 Live | State hash chain |

### 🤖 Autonomous NPCs

| System | File | Status | Purpose |
|--------|------|--------|---------|
| `NPCSystem` | `server/src/modules/npc/` | 🟢 Live | NPC runtime |
| `MemoryCache` | `server/src/modules/npc/memory.ts` | 🟢 Live | Event persistence |
| `Relationships` | `server/src/modules/npc/relations.ts` | 🟢 Live | NPC connections |

### ⚔️ Combat & Loot

| System | File | Status | Purpose |
|--------|------|--------|---------|
| `CombatDirector` | `server/src/modules/combat/` | 🟢 Live | Server-authoritative combat |
| `AntiNinjaLoot` | `server/src/modules/loot/` | 🟢 Live | 60s kill lock |
| `PlayerStatsSync` | `server/src/core/` | 🟢 Live | XP/level broadcast |

---

## Design Language — Stitch Theme

### Color Palette

```css
:root {
  /* Primary — Deep Marine (void of space) */
  --deep-marine: #0a0e14;
  --void-black: #070711;
  
  /* Accent — Ethereal Energy */
  --primary-blurple: #afc8f0;
  --energy-amber: #ffb77d;
  --mana-cyan: #00e5ff;
  --malachite: #2ae500;
  
  /* Glassmorphism */
  --glass-bg: rgba(16, 20, 25, 0.6);
  --glass-border: rgba(175, 200, 240, 0.15);
  --glass-glow: rgba(0, 229, 255, 0.1);
}
```

### Typography System

```
┌──────────────────────────────────────────────────────────────────────┐
│ DISPLAY — Epilogue (geometric, sharp)                                │
│ ████████████████████████████████████████████████████████████████     │
│ Areloria Codex Engine — The Living World Simulation                 │
├──────────────────────────────────────────────────────────────────────┤
│ BODY — Inter (readable, modern)                                     │
│ ████████████████████████████████████████████████████████████████     │
│ Deterministic simulation with 10Hz tick. Every state reproducible.    │
├──────────────────────────────────────────────────────────────────────┤
│ CODE — JetBrains Mono (precise, technical)                          │
│ ████████████████████████████████████████████████████████████████     │
│ WorldTick.ts:100 → const tick = await clock.tick()                 │
└──────────────────────────────────────────────────────────────────────┘
```

### Visual Motifs

```
✦ Starfield particles in void background
✦ Hexagonal grid overlay (subtle)
✦ Glyph borders with corner accents
✦ Pulsing energy lines between connected concepts
✦ Depth layers with parallax scroll
```

---

## Quick Navigation

### Start Here
```
┌─────────────────────────────────────────────────────────────────────┐
│  🚀 QUICK START                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. [README.md](../README.md)          → Project overview          │
│  2. [Vision](Areloria-Vision)       → World design philosophy     │
│  3. [ARE-Logic-Core](ARE-Logic-Core) → Core simulation model       │
│  4. [NPC_Core](NPC_Core)            → Autonomous NPCs              │
│  5. [Deployment](../DEPLOYMENT.md)  → VPS setup                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### By Category

| 🎯 Vision | ⚙️ Systems | 🤖 NPCs | 🛡️ Operations |
|-----------|-------------|---------|-----------------|
| [Areloria Vision](Areloria-Vision) | [ARE-Logic-Core](ARE-Logic-Core) | [NPC_Core](NPC_Core) | [Guard_and_Ops](Guard_and_Ops) |
| [Research Publications](Research-Publications) | [WorldTick](WorldTick-and-10Hz-Simulation) | [Economy_and_Matrix](Economy_and_Matrix) | [Systems_Architecture](Systems_Architecture) |
| [Determinism](Determinism) | [Asset Forge](Asset-Forge-and-2D-Pipeline) | — | — |

---

## Status Indicators

```
🟢 LIVE     — Fully implemented and running
🟡 BETA     — Implemented but may change
🔵 PLANNED  — On the roadmap
⚪ RESEARCH — Theoretical / under exploration
```

---

## Maintenance Rules

```
┌─────────────────────────────────────────────────────────────────────┐
│  📜 WIKI CONVENTIONS                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ✓ Use [[Page]] wiki links for internal navigation                │
│  ✓ Start each page with Tags: and Status:                         │
│  ✓ Link back to Home, Glossary, and at least one implementation   │
│  ✓ Use Implementation anchors (file paths) for code references    │
│  ✓ End with See also section                                      │
│  ✗ Don't use theory without code anchor                           │
│  ✗ Don't duplicate information across pages                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Auto-Generated Content

This wiki is automatically synced from project documentation. The **Codex Engine** pulls from:

```
Source                          → Generated Page
─────────────────────────────────────────────────
docs/wiki/*.md                  → (copied as-is)
server/src/                     → Implementation-Map
.git/commits                    → Changelog
docs/ROADMAP_TO_RELEASE.md      → Roadmap
docs/PROJECT_STATUS_2026.md     → Status
```

---

## External Resources

| Resource | Link |
|----------|------|
| 🌐 Project Website | [Arelorian.de](https://www.Arelorian.de) |
| 📂 GitHub Repository | [OuroborosCollective/Wasd](https://github.com/OuroborosCollective/Wasd) |
| 🎨 Design System | [Stitch Integration](../STITCH_MCP_INTEGRATION.md) |
| 📊 Open Science | [OSF Publications](Research-Publications) |

---

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   "The world must be allowed to become strange,                             ║
║    but never nondeterministic by accident."                                  ║
║                                                                              ║
║                              — Areloria Design Principles                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

Status: Living Wiki | Last Sync: Auto-generated
Version: 1.0.0 | Build: Deterministic 🔮
```
