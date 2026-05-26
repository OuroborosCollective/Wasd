## 2026-05-26 - Accessible Form Control Patterns
**Learning:** In complex monorepos with utility-first CSS (Tailwind), interactive elements like range sliders often lack explicit `id`/`htmlFor` pairings, which are critical for screen readers even when nested inside a label. Additionally, dynamic status messages triggered by slider changes are often missed by assistive technologies without `aria-live`.
**Action:** Always verify explicit labeling for form controls and implement `aria-live="polite"` for any UI element that updates its text content based on user interaction with other controls.
