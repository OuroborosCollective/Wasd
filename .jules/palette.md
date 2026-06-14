## 2026-05-23 - Keyboard Shortcuts for HUD Actions
**Learning:** Adding keyboard shortcuts to frequent HUD actions (like looting) significantly improves UX for power users. Including a visual `<kbd>` hint makes the shortcut discoverable without requiring documentation.
**Action:** Always pair keyboard listeners with visual hints and ensure accessibility (aria-labels) for the associated buttons.
## 2026-05-24 - Visual Keyboard Hints and Search Interactivity
**Learning:** Adding stylized <kbd> hints for shortcuts (like '/' for search and 'ESC' to close) makes power-user features discoverable. Pairing search with 'Enter' to select the first result creates a high-efficiency navigation flow.
**Action:** Use the <kbd> pattern for all keyboard-accessible actions and ensure search inputs support terminal execution via 'Enter'.

## 2026-06-13 - Syncing Visual Hints with Keyboard Listeners
**Learning:** Displaying a keyboard hint (e.g., `<kbd>E</kbd>`) without an active listener in the React lifecycle creates a broken promise to the user. Global keyboard listeners in `main.tsx` must be synchronized with the visibility of interaction prompts to ensure "what you see is what you can press."
**Action:** When adding visual shortcut hints, immediately verify or implement the corresponding `keydown` handler in the nearest stable parent component.
