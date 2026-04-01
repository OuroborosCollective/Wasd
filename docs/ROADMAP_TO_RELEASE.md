# Roadmap to release — aligned with Master Design Bible

This document translates **`docs/MASTER_DESIGN_BIBLE.md`** into **concrete engineering work** and records **gaps** between vision and the current codebase. It is the checklist for “what remains until we can call the game shippable.”

## How to use (agents and humans)

1. Read **`docs/PROJECT_STATUS_2026.md`** for what already works.  
2. Pick items below; implement; **update both** this file and `PROJECT_STATUS_2026.md` when a slice is done.  
3. If scope changes, edit **`docs/MASTER_DESIGN_BIBLE.md`** only when the **vision** changes — not for minor task lists.

---

## Tier A — Blockers for any public “playable” label

| ID | Area | Gap | Notes |
|----|------|-----|-------|
| A1 | Client | **Bundle size / load time** | **Partial:** `babylon-core` / `babylon-loaders` split, lazy glTF registration, thin `main.ts` + `clientBoot.ts`; Firebase + UI chunks + dynamic panels; **next:** trim `@babylonjs/core` surface (side-effect imports), optional CDN for engine |
| A2 | Combat | **`attack` not fully simulated** | **Partial:** filtered targets, weapon damage, cooldowns, hostile chase+aggro+leash, counter-attack, player death+respawn, gold+item drops, `pickup_loot`, mobile loot strip + death UI; still no ranged combat, party/revive, or full loot log UI |
| A3 | Quests | **`collect` / `combat` completion** | **Partial:** collect turn-in on NPC talk; combat completes on kill; still no rich objective UI |
| A4 | Persistence | **Production save model** | Firestore/Postgres paths exist; verify one path for player + world state in prod |
| A5 | Auth | **Real auth on client** | Dev `dev_*` players OK locally; production token flow and session hardening |

---

## Tier B — Design Bible pillars (major systems)

Cross-reference: **`docs/MASTER_DESIGN_BIBLE.md`**.

| Pillar (Bible) | Current repo reality | Work remaining |
|----------------|----------------------|----------------|
| **Infinite / procedural world** | Chunks, terrain concepts in docs; observer ideas in server | Wire streaming, LOD, and server chunk authority to client camera |
| **Civilization ladder** | Guild / land / economy modules exist | End-to-end UX + persistence + balance |
| **NPC depth** | Personality, memory, genealogy, schedules — substantial code | Connect to live AI/LLM policies only where intended; performance caps |
| **Classless skills + stamina** | Skills / player stats in modules | Full progression UI and server validation |
| **Loot / affixes** | Item registry, generators in codebase | Drop tables, rarity curves, anti-exploit |
| **Crafting / economy** | Many systems + tests | Market UI, sinks, Matrix Energy rules in live loop |
| **Brain / Oracle / Matrix** | Modules present | Feature flags, rate limits, admin tooling |
| **GM / No-code editor** | Routes, panels, GM messages | Stabilize against Babylon scene; document workflows |
| **GLB pipeline** | Upload, registry, validation paths | Finalize public URLs, CDN, and client loading errors UX |

---

## Tier C — Polish and ship criteria

- **Audio**: `BabylonAdapter.playSound` is stub — wire Web audio or Babylon audio.  
- **Mobile**: Joystick + dialogue; verify all panels on small screens.  
- **Localization**: Key-based strings if Bible requires multi-language.  
- **Security**: Rate limits on WS, admin routes, file uploads — see `docs/SECURITY_AND_TRUST_MODEL.md`.  
- **Observability**: Structured logs, metrics, error reporting for VPS.  
- **Release checklist**: `docs/RELEASE_READINESS.md`, `docs/FINALIZATION_CHECKLIST.md` — keep in sync with this roadmap.

---

## Documentation debt

| Item | Action |
|------|--------|
| `docs/CLIENT_MANIFEST.md` | Idealized tree — add banner or regenerate from `client/src` |
| Large `areloria_*reconstruction*.md` | Historical — do not treat as spec; see `docs/DOCUMENTATION_INDEX.md` |
| Per-module docs under `docs/` | Many describe intent; validate against `server/src/modules` when touching a system |

---

## Definition of “documentation updated”

For every meaningful PR:

- [ ] **Code or data changed?** Update `docs/PROJECT_STATUS_2026.md` if user-visible or architectural.  
- [ ] **Scope toward release changed?** Adjust this roadmap (check off or add rows).  
- [ ] **Vision changed?** Update `docs/MASTER_DESIGN_BIBLE.md` only with stakeholder agreement.

---

*Last structural refresh: April 2026. Replace this date when you do a full pass.*
