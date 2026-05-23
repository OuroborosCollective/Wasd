# Research Publications

Tags: `research`, `osf`, `publications`, `are`, `proofs`, `blueprints`
Status: `external-research-index`

This page links the Areloria / WASD wiki to external research publications and project material hosted on OSF.

OSF links are treated as research anchors. They should be cited by agents when discussing the mathematical or conceptual foundation of [[ARE Logic Core|ARE-Logic-Core]], [[ARE-Erdos Attractor Model|ARE-Erdos-Attractor-Model]] and deterministic simulation.

---

## OSF research anchors

| Key | OSF link | Wiki relevance |
| --- | --- | --- |
| OSF-CUWTV | https://osf.io/cuwtv | Primary ARE / Areloria research project anchor |
| OSF-CUWTV-Files | https://osf.io/cuwtv/files/uv9qr | File/material anchor for CUWTV project |
| OSF-B59WS | https://osf.io/b59ws | Additional research/publication anchor |
| OSF-8ENSZ | https://osf.io/8ensz | Additional research/publication anchor |
| OSF-J7TRZ | https://osf.io/j7trz | Additional research/publication anchor |

---

## How to use these links

Use these OSF anchors when a page or agent prompt discusses:

- [[ARE Logic Core|ARE-Logic-Core]],
- [[ARE-Erdos Attractor Model|ARE-Erdos-Attractor-Model]],
- [[Kappa|Glossary#kappa]],
- [[WorldTick and 10Hz Simulation|WorldTick-and-10Hz-Simulation]],
- deterministic state pruning,
- stateless simulation research,
- mathematical blueprints behind Areloria.

---

## Research vs implementation

OSF publications are **research anchors**, not automatic proof that a feature is implemented in the repository.

Use this rule:

```txt
OSF link = research / publication anchor
Wiki concept page = explanation and navigation
Implementation Map = actual code anchor
PR / commit = shipped change
```

This keeps Areloria scientifically ambitious without confusing theory with production code.

---

## Suggested citation pattern inside wiki pages

```md
Research anchor: [OSF-CUWTV](https://osf.io/cuwtv)
Implementation anchor: `server/src/core/WorldTick.ts`
Status: `research`, `planned`, `prototype`, or `implemented`
```

---

## See also

- [[Home]]
- [[Glossary]]
- [[ARE Logic Core|ARE-Logic-Core]]
- [[ARE-Erdos Attractor Model|ARE-Erdos-Attractor-Model]]
- [[Implementation Map|Implementation-Map]]
- [[Agent Index|Agent-Index]]