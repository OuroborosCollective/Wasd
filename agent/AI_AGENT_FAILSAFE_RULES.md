# AI Agent Failsafe Rules - Jules Agent Service

This document defines the immutable architectural constraints for the Jules Agent Service within the Areloria WASD ecosystem. These rules ensure systemic stability, emergent behavior, and world-state integrity.

## Core Constraints

- **Do not remove observer simulation:** The system must maintain an active observer layer to process agent perceptions and environmental interactions.
- **Do not remove chunk size 64x64:** World partitioning is strictly bound to 64x64 grids to ensure optimized spatial indexing and service synchronization.
- **Do not remove NPC memory/genealogy:** Agents must persist individual histories and ancestral data to maintain narrative continuity and evolutionary traits.
- **Do not remove politics:** Societal structures, faction relationships, and power dynamics must remain part of the core agent logic for emergent storytelling.
- **Do not remove matrix energy:** The underlying energy distribution model (Matrix Energy) is required for agent life-cycles, action costs, and world-state balancing.
- **Do not remove brain:** The cognitive logic architecture (Brain) of Jules agents must not be bypassed or replaced by stateless models; it is the center of autonomous decision-making.
- **Do not remove GM editor:** Integrated Game Master tools are essential for real-time world-state manipulation, monitoring, and live balancing.
- **Do not remove GLB pipeline:** The automated asset processing pipeline for GLB models must remain integrated for seamless 3D visualization and agent-mesh updates.

## Service Context
- **Project:** Areloria WASD (Metaverse & AI-RPG)
- **Service Path:** `services/jules-agent-service/`
- **Governance:** Sovereign Studio Design-Coder Standards