## 2023-11-20 - Drop Zone Div Accessibility
**Learning:** `div`-based drag-and-drop zones used as file upload triggers are invisible to screen readers and keyboard users unless explicitly enhanced. They require `role="button"`, `tabindex="0"`, an `aria-label`, and an `onkeydown` handler to map the `Enter` and `Space` keys to trigger the hidden file input.
**Action:** When implementing custom drag-and-drop zones with a clickable upload fallback, always manually implement the necessary ARIA attributes and keyboard event handlers.
