# Master Design Bible

## Vision
Arelorian ist ein persistentes Browser-MMORPG mit emergenter Weltlogik. Die Welt ist theoretisch unendlich,
wird prozedural erzeugt und über Beobachterzonen simuliert.

## Fünf Axiome
1. Informationsfeld
2. Emergenz
3. Persistenz
4. Ouroboros-Zyklus
5. Beobachter

## Welt
- Prozedurale Welt
- Chunks 64x64
- Biome als natürliche Grenzen
- Ruinen, Dungeons und historische Schichten

## Zivilisationen
- Guild -> Village -> City -> Kingdom -> Nation
- Spieler und NPCs besitzen dieselben zivilisatorischen Rechte

## NPCs
- Personality
- DNA/Traits
- Genealogie und Häuser
- Memory und Shared Memory
- Kultur und Religion
- Politik und Familiengeschichte

## Gameplay
- klassenloses Skill-System
- Skills durch Nutzung
- Stamina als Kernressource
- Diablo-artiges Loot
- Magie als Skillzweig
- Crafting, Handel und Weltwirtschaft

## Systeme
- Server Brain mit 13-Punkte-Modell
- Dudenregister und Orakel
- Matrix-Energie
- Weltwunder und Schattenregisterportal
- GM-Editor
- GLB-Asset-Pipeline
## Art & Assets
- See [Procedural Style Matrix](./PROCEDURAL_STYLE_MATRIX.md) for lightweight, data-driven visual styling rules.

---

## Implementation snapshot (engineering, April 2026)

This section links **vision** to **repository reality**. Update it when major pillars land.

| Bible area | In repo today | Doc for detail |
|------------|---------------|----------------|
| Persistent world / data | `game-data/`, `WorldTick`, persistence adapters | `docs/PROJECT_STATUS_2026.md` |
| NPCs / dialogue / quests | `NPCSystem`, `QuestEngine`, JSON content; starter **Millbrook** arc | `game-data/`, `docs/NPC_SYSTEM.md` |
| 3D client | **Babylon.js** primary; `IEngineBridge` | `docs/CLIENT_ARCHITECTURE.md` |
| Networking | WebSocket, `entity_sync`, scenes in JSON | `docs/NETWORKING_MODEL.md` |
| GM / admin | GM routes, panels (coverage varies) | `docs/GM_EDITOR.md` |
| Economy / Matrix / Brain | Modules + tests; not all in live tick | `docs/ROADMAP_TO_RELEASE.md` |

**Full gap list:** [Roadmap to release](./ROADMAP_TO_RELEASE.md).  
**Agent doc rule:** any merge that changes player-visible or architectural behavior should update [Project status 2026](./PROJECT_STATUS_2026.md).
