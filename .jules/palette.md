## 2023-11-20 - Drop Zone Div Accessibility
**Learning:** `div`-based drag-and-drop zones used as file upload triggers are invisible to screen readers and keyboard users unless explicitly enhanced. They require `role="button"`, `tabindex="0"`, an `aria-label`, and an `onkeydown` handler to map the `Enter` and `Space` keys to trigger the hidden file input.
**Action:** When implementing custom drag-and-drop zones with a clickable upload fallback, always manually implement the necessary ARIA attributes and keyboard event handlers.

## 2024-03-17 - Decorative Emoji Accessibility
**Learning:** When hiding decorative icons or emojis inside interactive elements like buttons or drop zones, apply `aria-hidden="true"` to an inner wrapper (e.g., `<span>` or `<div>`), not the parent interactive element, to prevent hiding the active target from screen readers.
**Action:** Consistently review raw DOM elements for unhidden decorative text nodes that may clutter screen reader output, specifically targeting custom UI constructs outside of standard component libraries.

## 2024-03-17 - Manual Loading State Accessibility on DOM Elements
**Learning:** For manually created DOM elements without a UI library (using `document.createElement`), accessibility attributes for loading states must be explicitly toggled in JavaScript. Adding `aria-busy="true"` and `disabled=true` while updating button text provides immediate context for screen readers when an async network request starts.
**Action:** Always toggle `.disabled`, update `.innerText`, and set/remove `aria-busy` inside the `try/finally` blocks of click handlers for manually rendered vanilla JS buttons.
