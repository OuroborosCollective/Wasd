# Glossary

Tags: `glossary`, `keywords`, `crosslinks`, `wiki-index`
Status: `canonical-terms`

This glossary defines canonical terms for the Areloria / WASD wiki.

Use these terms consistently in PRs, issues, commits and agent prompts.

---

## A

### Areloria

The game world and product identity. See [[Areloria Vision|Areloria-Vision]].

### ARE

**Authentic Reality Emancipation**. The deterministic reality framework behind Areloria. See [[ARE Logic Core|ARE-Logic-Core]].

### ARE Asset Forge

The deterministic asset metadata processor in `scripts/are-asset-forge.mjs`. See [[Asset Forge and 2D Pipeline|Asset-Forge-and-2D-Pipeline]].

### ARE-Erdos Attractor

A research model for graph distance, stability and deterministic pruning. See [[ARE-Erdos Attractor Model|ARE-Erdos-Attractor-Model]].

### Asset Hash

Stable hash attached to an asset manifest entry. Used for deterministic identification and debugging.

---

## D

### Determinism

The rule that the same inputs should produce the same authoritative result. See [[Determinism]] and [[WorldTick and 10Hz Simulation|WorldTick-and-10Hz-Simulation]].

### Depth Metadata

Visual and interaction metadata such as `zHeight`, `isoFootprint`, `shadow` and `frame`. See [[Asset Forge and 2D Pipeline|Asset-Forge-and-2D-Pipeline]].

---

## E

### Erdos Distance

Topological distance from a trusted core node or singularity. Used by the [[ARE-Erdos Attractor Model|ARE-Erdos-Attractor-Model]].

---

## F

### Frame

A rectangle inside an atlas image used to crop one sprite. Runtime anchor: `entry.frame`.

### Forge Report

Generated JSON report written by the Asset Forge. Expected path: `apps/client-2d/public/2d-assets/credits/are-asset-forge-report.json`.

---

## I

### Implementation Anchor

A concrete repository path that maps a wiki concept to actual code. See [[Implementation Map|Implementation-Map]].

### Iso Footprint

Approximate isometric footprint used for sorting, picking and collision-like visual placement.

---

## K

### Kappa

Canonical integer scaling constant. Current research convention: `kappa = 1000`. See [[ARE-Erdos Attractor Model|ARE-Erdos-Attractor-Model#kappa-standardization]].

---

## M

### Manifest

Runtime asset index consumed by the client. Primary path: `apps/client-2d/public/2d-assets/manifest.json`.

### Matrix Energy

Areloria economy/building energy concept. See [[Economy and Matrix|Economy_and_Matrix]].

---

## O

### Observer

The fifth ARE axiom: a player or agent that collapses potential world state into observed truth. See [[ARE Logic Core|ARE-Logic-Core#the-five-axioms]].

### Ouroboros Cycle

Closed loop of input, simulation, memory and future decision. See [[ARE Logic Core|ARE-Logic-Core#the-five-axioms]].

---

## P

### Pickable

Manifest metadata meaning the object can be selected or interacted with by client logic.

### Pruning

Deterministic removal, conversion or deactivation of isolated/noisy nodes. See [[ARE-Erdos Attractor Model|ARE-Erdos-Attractor-Model#pruning-interpretation]].

---

## S

### Soak Test

A long stability test window, usually 72 hours, where risky merges are avoided and only hard bug fixes are allowed.

### Stateless Simulation

Simulation style where authoritative state is derived from inputs, seeds and tick rules rather than uncontrolled mutable bloat. See [[Determinism]].

### Stitch

External/generated sprite atlas source used by the 2D client pipeline. See [[Asset Forge and 2D Pipeline|Asset-Forge-and-2D-Pipeline]].

---

## W

### WASD

The main repository and control name for the Areloria monorepo.

### WorldTick

Authoritative server simulation heartbeat. See [[WorldTick and 10Hz Simulation|WorldTick-and-10Hz-Simulation]].

---

## See also

- [[Home]]
- [[Implementation Map|Implementation-Map]]
- [[Agent Index|Agent-Index]]