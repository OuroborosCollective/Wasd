## 2025-05-15 - [Accessibility & Feedback in Status Bars]
**Learning:** Adding `role="progressbar"` with scaled ARIA values and a conditional `animate-pulse` class for low-health states provides both assistive technology support and better visual situational awareness without cluttering the UI. Semantic `<kbd>` tags should be used consistently for all keyboard shortcuts to maintain a high level of document structure.
**Action:** Always verify if status bars have ARIA roles and if low-state warnings (like <20% health) are visually indicated by animations. Use `<kbd>` for all single-key interaction hints.

## 2025-05-15 - [Accessibility in HUD Overlays]
**Learning:** HUD components in complex game interfaces often use purely decorative icons and custom-styled progress bars that are invisible to screen readers. Adding `role="progressbar"` with scaled ARIA values and marking decorative icons with `aria-hidden="true"` significantly improves the experience for assistive technology users without changing the visual design.
**Action:** Always verify that any visual "meter" or "bar" has a corresponding ARIA role and that all icon-only decorative elements are hidden from the accessibility tree.

## 2028-06-20 - [HUD Accessibility & Quest Feedback]
**Learning:** Adding semantic ARIA roles (progressbar) to quest trackers and live regions (role="status") to interaction prompts ensures that screen reader users are kept in the loop with world changes. Visual color-coding (green for 100% completion) provides a micro-moment of satisfaction that improves the "game feel" of the HUD.
**Action:** Ensure all progress-based UI elements use ARIA attributes and provide distinct visual states for completion (success) vs. progress.
