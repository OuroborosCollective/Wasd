## 2026-06-03 - [Direct DOM UI Accessibility]
**Learning:** UI components created via direct DOM manipulation (`document.createElement`) in this codebase often lack basic ARIA roles and keyboard interaction support (e.g., Escape to close). Unlike React components, these require manual attachment of attributes and listeners to meet accessibility standards.
**Action:** When touching legacy UI modules like `hud.ts` or `chat.ts`, always check for missing `role`, `aria-modal`, and `keydown` listeners for closing dialogues.
