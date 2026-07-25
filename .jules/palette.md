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

## 2025-05-15 - Standardizing Gameplay Window Close Patterns
**Learning:** Gameplay windows that lack a visible close button frustrate mouse-centric users, even if keyboard shortcuts exist. Standardizing the close button with a visual `<kbd>ESC</kbd>` hint and `aria-keyshortcuts` provides a consistent "way out" across all UI modules.
**Action:** Implement a unified `WindowFrame` header pattern that includes a standardized `.gameplay-window__close` button with integrated keyboard hints for all gameplay panels.

## 2026-03-20 - Semantic Keyboard Shortcut Indicators for Dialog Options
**Learning:** Replaced plain, bracketed text shortcut markers (e.g., "[1]") inside generic containers with semantic, dynamically styled `<kbd>` elements. This guarantees assistive technologies correctly announce shortcut keys to screen readers while keeping keyboard visual indicators fully harmonized with hover, active, and selected styles within a brutalist, sharp-cornered design language.
**Action:** Always wrap interactive button keyboard shortcuts in semantic, themed `<kbd>` tags to maintain accessibility and high contrast visual hierarchy.

## 2026-06-15 - Focusable Semantic NPC Dialogue Advancement
**Learning:** Replacing plain click handlers on decorative containers with semantic, focusable buttons is key to both keyboard accessibility and screen reader interaction. Moreover, using high-contrast hover and active outline glows, inline keyboard indicators, and capture-phase event interceptors guarantees a highly polished, responsive dialogue navigation flow without triggering background game logic.
**Action:** Always design dialogue and confirmation prompts with fully focusable semantic elements, clear shortcut hints, and robust event interception handlers.
