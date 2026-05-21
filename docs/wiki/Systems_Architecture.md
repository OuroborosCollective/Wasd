# Systems Architecture: The Machine Heart

Areloria's architecture is optimized for 10Hz deterministic simulation.

## 1. The 10Hz World Tick
The authoritative engine heart beats exactly every 100ms.
- All logic (Combat, Loot, NPC Brains, Economy) is synchronized to this tick.
- No action happens "between" ticks.

## 2. Chunk System
The world is divided into **64x64 grids** called Chunks.
- Chunks handle local physics, entity visibility, and terrain adapters.
- Biomes act as natural boundaries for procedural generation.

## 3. The Heuristic World Brain (13-Point Model)
A meta-layer that monitors the world state and triggers events.
- **4 World Points**: Resource levels, population density, conflict intensity, environmental health.
- **4 Interpretation Points**: Political tension, market stability, religious fervor, cultural shift.
- **4 Dynamic Points**: Imminent threats, emergent opportunities, historical echoes, oracle resonance.
- **1 Center**: The Aggregator that synthesizes all points into a global "Directives" vector.

## 4. Layered Simulation
- **Watchdogs**: Monitor anomalies and thresholds.
- **Brains**: Global interpretation and dynamic state processing.
- **Plexity**: Dictates entity weight and simulation priority.
