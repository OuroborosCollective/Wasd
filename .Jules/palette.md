## 2025-05-15 - [Accessibility & Feedback in Status Bars]
**Learning:** Adding `role="progressbar"` with scaled ARIA values and a conditional `animate-pulse` class for low-health states provides both assistive technology support and better visual situational awareness without cluttering the UI. Semantic `<kbd>` tags should be used consistently for all keyboard shortcuts to maintain a high level of document structure.
**Action:** Always verify if status bars have ARIA roles and if low-state warnings (like <20% health) are visually indicated by animations. Use `<kbd>` for all single-key interaction hints.

## 2025-05-15 - [Accessibility in HUD Overlays]
**Learning:** HUD components in complex game interfaces often use purely decorative icons and custom-styled progress bars that are invisible to screen readers. Adding `role="progressbar"` with scaled ARIA values and marking decorative icons with `aria-hidden="true"` significantly improves the experience for assistive technology users without changing the visual design.
**Action:** Always verify that any visual "meter" or "bar" has a corresponding ARIA role and that all icon-only decorative elements are hidden from the accessibility tree.

## 2028-02-14 - [Quest Tracker Accessibility]
**Learning:** Progress bars in objective trackers are often purely visual. Implementing the WAI-ARIA `progressbar` pattern with `aria-valuetext` for percentage-based progress ensures that screen reader users can track mission objectives with the same precision as sighted players.
**Action:** Always wrap visual progress indicators in Quest or Objective trackers with `role="progressbar"` and provide both raw (`aria-valuenow`) and human-readable (`aria-valuetext`) progress values.

## 2025-05-15 - [Standardizing Interaction Hints]
**Learning:** Standardizing keyboard shortcut hints (like "ESC" for closing panels) across disparate UI components significantly improves discoverability and perceived "polish." Using a global CSS class for these hints ensure consistent styling while allowing component-specific overrides for thematic integration.
**Action:** When implementing common interaction patterns (close, save, cancel), always include a visual keyboard hint using the `.cz-kbd` class and appropriate ARIA attributes (`aria-keyshortcuts`, `aria-label`).
