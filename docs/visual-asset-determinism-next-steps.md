# Visual Asset Determinism Next Steps

This PR continues the Arelorian visual audit on current `main`.

Resolved in code:

- Asset IDs are derived through deterministic asset binding logic, not volatile random fallbacks.
- Deprecated and corrupt manifest entries remain excluded from render candidates.
- Letter, number, label, sheet, and font artifacts are blocked from prop/character binding.
- Candidate tie ordering avoids locale-dependent collation.

Remaining ARE visual follow-up:

- Add/keep a dedicated visual determinism gate for render and asset paths.
- Keep crop recognition and asset classification in game-data/template pipelines, not runtime mocks.
