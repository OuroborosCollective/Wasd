## 2026-03-14 - Added Target Highlight Ring
**Learning:** Three.js scenes benefit greatly from clear visual indicators for interactable objects (like NPCs and loot), especially when rendered at an isometric angle where depth is ambiguous. A pulsing ring provides immediate feedback on what the player is targeting.
**Action:** Always consider adding explicit visual cues (like a selection ring or highlight) to the 3D world, not just relying on floating UI labels or tooltips, to bridge the gap between world space and UI space.

## 2026-03-16 - [Added loading and accessible form states]
**Learning:** [Many forms generated via `document.createElement()` dynamically lack basic ARIA features like labels and button disabled states because they miss native semantic HTML templates. Adding these via `setAttribute('aria-label')` and checking `disabled` during async functions drastically improves form reliability.]
**Action:** [When creating custom DOM elements (especially inputs/buttons without explicit `<label>` tags), always bind ARIA properties explicitly and disable interactable buttons on await to avoid double submits and confuse screen readers.]

## 2026-03-25 - [Added ARIA Labels and Live Regions to Dynamic Chat UI]
**Learning:** Dynamic UI components created via raw HTML strings (like the HUD chat) often lack essential accessibility features. Specifically, screen readers will not announce new chat messages without `aria-live="polite"` and `role="log"` on the container. Additionally, inputs created without a dedicated `<label>` element must have an explicit `aria-label` attribute, otherwise they are completely inaccessible to screen reader users who cannot rely on `placeholder` text alone.
**Action:** Always include semantic attributes (`aria-label`, `aria-live`, `role`) directly inside the HTML template strings when building dynamic, form-like components via `innerHTML`.

## 2026-04-26 - [Accessibility in Grid-based Game UI]
**Learning:** For game inventories that use grid layouts of div elements, adding role="button" and tabIndex={0} is critical for keyboard accessibility. Furthermore, screen readers cannot reliably infer the purpose of icon-only currency displays or item slots without explicit aria-label attributes.
**Action:** Always ensure interactive grid elements have semantic roles and keyboard event handlers (Enter/Space), and provide descriptive labels for all icon-based data points.
## 2025-05-14 - [HUD Accessibility & Tooltips]
**Learning:** Visual-only status indicators (HP/MP rings) are opaque to screen readers and often leave visual users guessing exact values. Using `role="progressbar"` with ARIA attributes (`aria-valuenow`, etc.) and the native `title` attribute provides a dual-win for accessibility and UX with zero CSS/JS overhead.
**Action:** Always check if progress indicators in the HUD have semantic roles and hover titles for precision.

## 2025-05-15 - [Character Selection Accessibility via ARIA Radio Patterns]
**Learning:** For game character selection screens where only one item can be active at a time, using `role="radiogroup"` and `role="radio"` provides a much clearer semantic model for screen readers than generic buttons or list items. This explicitly communicates the "exclusive choice" nature of the selection.
**Action:** Use the radio pattern for any "single-select" list of complex items (like character cards or equipment slots) to ensure intent is clear to assistive technologies.

## 2025-05-16 - [ARIA Tab Pattern in Custom DOM Panels]
**Learning:** For game interfaces that use custom-built tab systems (via manual DOM manipulation rather than a UI library), screen readers are often left in the dark about the relationship between tab buttons and content. Implementing `role="tablist"` on the container and `role="tab"` with dynamic `aria-selected` attributes on buttons provides the necessary semantic structure for non-visual navigation.
**Action:** Always wrap custom tab buttons in a `role="tablist"` container and synchronize `aria-selected` state within the tab-switching logic.
