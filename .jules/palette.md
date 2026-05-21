## 2028-08-20 - Global Shortcut Collision Prevention
**Learning:** Global keyboard shortcuts (mnemonic toggles) in a complex HUD can interfere with chat and name inputs.
**Action:** Always check `event.target` for `HTMLInputElement` or `HTMLTextAreaElement` before processing HUD-level key events.

## 2028-08-20 - Modal Closure Accessibility
**Learning:** Users instinctively use the `Escape` key to close overlays/modals in desktop-like browser interfaces.
**Action:** Implement a global `Escape` key listener alongside specific mnemonic toggles to provide a standard "back/close" UX pattern.
