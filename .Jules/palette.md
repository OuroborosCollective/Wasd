## 2026-03-14 - Added Target Highlight Ring
**Learning:** Three.js scenes benefit greatly from clear visual indicators for interactable objects (like NPCs and loot), especially when rendered at an isometric angle where depth is ambiguous. A pulsing ring provides immediate feedback on what the player is targeting.
**Action:** Always consider adding explicit visual cues (like a selection ring or highlight) to the 3D world, not just relying on floating UI labels or tooltips, to bridge the gap between world space and UI space.

## 2026-03-16 - [Added loading and accessible form states]
**Learning:** [Many forms generated via `document.createElement()` dynamically lack basic ARIA features like labels and button disabled states because they miss native semantic HTML templates. Adding these via `setAttribute('aria-label')` and checking `disabled` during async functions drastically improves form reliability.]
**Action:** [When creating custom DOM elements (especially inputs/buttons without explicit `<label>` tags), always bind ARIA properties explicitly and disable interactable buttons on await to avoid double submits and confuse screen readers.]

## 2026-03-25 - [Added ARIA Labels and Live Regions to Dynamic Chat UI]
**Learning:** Dynamic UI components created via raw HTML strings (like the HUD chat) often lack essential accessibility features. Specifically, screen readers will not announce new chat messages without `aria-live="polite"` and `role="log"` on the container. Additionally, inputs created without a dedicated `<label>` element must have an explicit `aria-label` attribute, otherwise they are completely inaccessible to screen reader users who cannot rely on `placeholder` text alone.
**Action:** Always include semantic attributes (`aria-label`, `aria-live`, `role`) directly inside the HTML template strings when building dynamic, form-like components via `innerHTML`.
