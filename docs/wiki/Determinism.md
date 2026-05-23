# Determinism: The Math of Areloria

In Areloria, "random" is a forbidden word in the core simulation. We operate on **Absolute Causality**.

## 1. Kappa Invariant (Fixed-Point Math)
To avoid floating-point drift across different browsers and hardware, we use the **Kappa Standard**:
- **Kappa = 1000**
- All simulation values are scaled by Kappa and treated as 64-bit integers.
- Example: A move speed of 1.25 units/tick is represented as **1250**.

## 2. Psi Evolution Formula
The state transition of the world is governed by the Trinitarian Psi Evolution:
```txt
Psi[n + 1] = kappa * (Psi[n] odot A_ARE)^3 + 3 * P(Psi[n])
```
- **Psi[n]**: Current state vector at tick n.
- **A_ARE**: Axiomatic coupling operator.
- **P(Psi[n])**: Plexity function (the weight of simulation entities).

## 3. Replayability
Every meaningful world state must be reproducible from:
1. **Initial Seed**
2. **Tick Number**
3. **Input Stream**
4. **Deterministic Engine Version**

Replay is our proof layer. If a combat result cannot be replayed, it did not happen.

## 4. ARE Determinism Gate
Our CI/CD pipeline enforces strict determinism rules for Level-A paths:
- Forbidden: `Math.random()`, `Date.now()`, `new Date()`, `randomUUID()`.
- Required: Sorted Map/Set iterations.
- Requirement: All simulation decisions must be traceable to the tick-derived seed.
