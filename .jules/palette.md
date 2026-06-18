## 2026-05-23 - Keyboard Shortcuts for HUD Actions
**Learning:** Adding keyboard shortcuts to frequent HUD actions (like looting) significantly improves UX for power users. Including a visual `<kbd>` hint makes the shortcut discoverable without requiring documentation.
**Action:** Always pair keyboard listeners with visual hints and ensure accessibility (aria-labels) for the associated buttons.
## 2026-05-24 - Visual Keyboard Hints and Search Interactivity
**Learning:** Adding stylized <kbd> hints for shortcuts (like '/' for search and 'ESC' to close) makes power-user features discoverable. Pairing search with 'Enter' to select the first result creates a high-efficiency navigation flow.
**Action:** Use the <kbd> pattern for all keyboard-accessible actions and ensure search inputs support terminal execution via 'Enter'.

## 2026-06-13 - Syncing Visual Hints with Keyboard Listeners
**Learning:** Displaying a keyboard hint (e.g., `<kbd>E</kbd>`) without an active listener in the React lifecycle creates a broken promise to the user. Global keyboard listeners in `main.tsx` must be synchronized with the visibility of interaction prompts to ensure "what you see is what you can press."
**Action:** When adding visual shortcut hints, immediately verify or implement the corresponding `keydown` handler in the nearest stable parent component.

## 2026-06-14 - Consistency in Multi-Language UI Elements
**Learning:** Inadvertent use of mixed languages in primary action buttons (e.g., "Reward abholen" vs "Claiming...") degrades trust and clarity. Consistency in language across all UI states is a prerequisite for a professional UX.
**Action:** Review button labels and transition states for language consistency during UI audits, especially in modules handling server-authoritative rewards or transactions.

## 2025-05-14 - [Consistency] Translating core interaction headers and adding keyboard hints
**Learning:** Found that core interaction overlays (Trading, Workbench) were using hardcoded German labels in an otherwise English HUD, creating a jarring UX. Additionally, discoverability of the ESC shortcut to close these overlays was low.
**Action:** Always ensure UI headers and ARIA labels are localized to the primary project language (English) and add <kbd>ESC</kbd> hints to interaction headers to reinforce keyboard navigation patterns found elsewhere in the app.

## 2025-05-22 - Standardizing NPC Dialogue Accessibility and Shortcuts
**Learning:** Found that the NPC dialogue system had keyboard shortcuts (1-4, 0, ESC) but lacked visual hints for ESC and ARIA attributes for all shortcuts. Standardizing these hints with `<kbd>` and adding `aria-keyshortcuts`/`aria-label` ensures that both power users and users with assistive technologies have a consistent experience.
**Action:** When implementing keyboard-driven menus or windows, always pair the visual `<kbd>` hint with `aria-keyshortcuts` on the interactive element. Ensure close buttons have clear `aria-label`s.
