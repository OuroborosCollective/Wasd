# Agent Index

Tags: `agents`, `copilot`, `cursor`, `jules`, `chatgpt`, `automation`
Status: `operational-guide`

This page tells AI agents and human maintainers how to work inside the Areloria / WASD repository without damaging deterministic systems.

---

## Prime directive

Do not make broad mixed changes shortly before or during a stability test.

Prefer small PRs that touch one concept and one implementation anchor.

---

## Required context pages

Before editing, read:

1. [[Home]]
2. [[Implementation Map|Implementation-Map]]
3. [[Glossary]]
4. the concept page related to your task

Examples:

| Task | Read first |
| --- | --- |
| Asset import | [[Asset Forge and 2D Pipeline|Asset-Forge-and-2D-Pipeline]] |
| Tick logic | [[WorldTick and 10Hz Simulation|WorldTick-and-10Hz-Simulation]] |
| ARE math | [[ARE-Erdos Attractor Model|ARE-Erdos-Attractor-Model]] |
| NPC behavior | [[NPC Core|NPC_Core]] |
| Deployment | [[Guard and Ops|Guard_and_Ops]] |

---

## PR shape rules

Good PR:

```txt
one subsystem
one reason
clear test path
wiki update if behavior changed
```

Bad PR:

```txt
NPC + Economy + CI + Date.now + asset rewrite + build config
```

---

## Stability window rule

During a 72h stability test:

- no large feature merges,
- no broad bot drafts,
- no mass refactors,
- only hard bug hotfixes,
- document postponed ideas as issues.

---

## Commit message examples

```txt
feat(client-2d): add ARE asset forge pipeline
fix(client-2d): render Stitch prop frames
ci(client-2d): assert asset forge smoke output
docs(wiki): add implementation map
```

---

## See also

- [[Home]]
- [[Glossary]]
- [[Implementation Map|Implementation-Map]]
- [[Guard and Ops|Guard_and_Ops]]