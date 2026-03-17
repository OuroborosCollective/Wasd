## 2023-11-20 - Drop Zone Div Accessibility
**Learning:** `div`-based drag-and-drop zones used as file upload triggers are invisible to screen readers and keyboard users unless explicitly enhanced. They require `role="button"`, `tabindex="0"`, an `aria-label`, and an `onkeydown` handler to map the `Enter` and `Space` keys to trigger the hidden file input.
**Action:** When implementing custom drag-and-drop zones with a clickable upload fallback, always manually implement the necessary ARIA attributes and keyboard event handlers.

## 2024-03-17 - Decorative Emoji Accessibility
**Learning:** When hiding decorative icons or emojis inside interactive elements like buttons or drop zones, apply `aria-hidden="true"` to an inner wrapper (e.g., `<span>` or `<div>`), not the parent interactive element, to prevent hiding the active target from screen readers.
**Action:** Consistently review raw DOM elements for unhidden decorative text nodes that may clutter screen reader output, specifically targeting custom UI constructs outside of standard component libraries.
