# ARE-Erdos Attractor Model

Tags: `are`, `erdos`, `kappa`, `topology`, `determinism`, `self-healing`
Status: `research-blueprint`

The **ARE-Erdos Attractor Model** maps graph distance and deterministic propagation into the ARE runtime. It is the mathematical bridge between [[ARE Logic Core|ARE-Logic-Core]], [[WorldTick and 10Hz Simulation|WorldTick-and-10Hz-Simulation]] and future self-healing simulation logic.

---

## Kappa standardization

`kappa = 1000` is the canonical integer scaling constant.

Continuous-looking values are projected into an integer grid before simulation logic evaluates them. This protects the runtime from floating-point drift and platform-dependent rounding.

Related terms:

- [[Kappa|Glossary#kappa]]
- [[Determinism]]
- [[WorldTick and 10Hz Simulation|WorldTick-and-10Hz-Simulation]]

---

## 10Hz simulation tick

The model assumes a fixed simulation interval of `100ms`, also described as a **10Hz tick**.

Dynamic delta-time is avoided for core simulation decisions. Rendering may interpolate, but authoritative simulation stays tick-bound.

See [[WorldTick and 10Hz Simulation|WorldTick-and-10Hz-Simulation]].

---

## Erdos distance

`E` describes topological distance from a core node, creator node, apex node or system singularity.

Practical interpretation:

- low `E` means close to trusted structure,
- high `E` means isolated or weakly connected,
- unreachable or stale nodes become pruning candidates.

---

## Attractor coefficient

The attractor coefficient translates distance into stabilizing force:

```txt
Omega_E = floor(kappa / (E + 1))
```

High trust/low distance produces stronger structural integrity. Isolated nodes converge toward zero influence.

---

## Pruning interpretation

The model supports deterministic pruning:

1. a node becomes isolated,
2. its effective graph distance no longer improves,
3. its stabilizing coefficient decays,
4. the runtime can convert it into passive residue, cache, loot, energy or removal.

This idea should be implemented cautiously and always behind tests.

---

## Implementation anchors

| Concept | Current / planned anchor | Status |
| --- | --- | --- |
| 10Hz tick | `server/src/core/WorldTick.ts` | implemented/active |
| Kappa integer grid | future `server/src/core/AREKernel.ts` | planned |
| Erdos network | future `server/src/core/AREErdosNetwork.ts` | planned |
| Self-pruning | future SelfHeal / energy capsule layer | planned |
| Asset metadata integrity | `scripts/are-asset-forge.mjs` | implemented for assets |

---

## See also

- [[Home]]
- [[Glossary]]
- [[ARE Logic Core|ARE-Logic-Core]]
- [[Implementation Map|Implementation-Map]]
- [[Determinism]]