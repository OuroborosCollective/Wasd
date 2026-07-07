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

## 2025-05-16 - Local Loading States for Asynchronous UI Actions
**Learning:** In asynchronous UI actions like equipping or selling items, missing feedback can lead to "double-click" race conditions and user confusion. Implementing a local `pendingActionId` state with `try...finally` ensures immediate visual feedback (e.g., "SELLING...") and prevents conflicting concurrent requests.
**Action:** Use a `pendingActionId` pattern and `try...finally` blocks for all asynchronous button actions to provide clear loading states and disable interaction during processing.

## 2025-05-17 - PNPM Version Mismatch in CI
**Learning:** The `packageManager` field in the root `package.json` must exactly match the pnpm version used by CI runners (e.g., v11.10.0 vs v11.8.0) to prevent build failures, even if local development uses a slightly different version.
**Action:** Always verify CI logs for pnpm version warnings and align the `packageManager` field with the environment's expected version to ensure build stability.
