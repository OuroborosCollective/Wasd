## 2025-05-15 - [Dialogue Accessibility Enhancement]
**Learning:** Manual DOM-based UI components (using `document.createElement`) do not inherit standard browser accessibility features like ARIA roles or keyboard interactions (Escape key) automatically.
**Action:** When auditing or creating manual overlays, explicitly apply `role="dialog"`, `aria-modal="true"`, and attach global `keydown` listeners for standard dismiss actions like the Escape key.
