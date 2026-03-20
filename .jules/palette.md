## 2023-11-20 - Drop Zone Div Accessibility
**Learning:** `div`-based drag-and-drop zones used as file upload triggers are invisible to screen readers and keyboard users unless explicitly enhanced. They require `role="button"`, `tabindex="0"`, an `aria-label`, and an `onkeydown` handler to map the `Enter` and `Space` keys to trigger the hidden file input.
**Action:** When implementing custom drag-and-drop zones with a clickable upload fallback, always manually implement the necessary ARIA attributes and keyboard event handlers.

## 2024-03-17 - Decorative Emoji Accessibility
**Learning:** When hiding decorative icons or emojis inside interactive elements like buttons or drop zones, apply `aria-hidden="true"` to an inner wrapper (e.g., `<span>` or `<div>`), not the parent interactive element, to prevent hiding the active target from screen readers.
**Action:** Consistently review raw DOM elements for unhidden decorative text nodes that may clutter screen reader output, specifically targeting custom UI constructs outside of standard component libraries.

## 2024-03-17 - Manual Loading State Accessibility on DOM Elements
**Learning:** For manually created DOM elements without a UI library (using `document.createElement`), accessibility attributes for loading states must be explicitly toggled in JavaScript. Adding `aria-busy="true"` and `disabled=true` while updating button text provides immediate context for screen readers when an async network request starts.
**Action:** Always toggle `.disabled`, update `.innerText`, and set/remove `aria-busy` inside the `try/finally` blocks of click handlers for manually rendered vanilla JS buttons.

## 2024-03-19 - ARIA Live Regions for Dynamic Chat Overlays
**Learning:** For dynamic text containers that continuously update with new information (like chat boxes or event logs), adding `role="log"` and `aria-live="polite"` ensures screen readers announce new incoming content without rudely interrupting the user's current task.
**Action:** When implementing or modifying live-updating UI sections such as chat messages or system notifications, always include these ARIA attributes to maintain a smooth experience for screen reader users.

## 2024-03-20 - HTML String Interpolation for Inline Event Handlers
**Learning:** When dynamically constructing raw HTML template strings with inline event handlers (e.g., in `client/src/ui/`), strictly use single quotes (`'`) for inner JavaScript strings within double-quoted (`"`) HTML attributes (e.g., `onclick="document.getElementById('id').style.display='none'"`) to prevent breaking the browser's HTML parser and rendering elements non-interactive. Additionally, using an unhidden text node like 'X' or '✕' for modal close buttons is an anti-pattern that causes redundant screen reader announcements. Always wrap the visual text character in a `<span aria-hidden="true">` to hide it from screen readers, while relying on the button's `aria-label` for accessibility.
**Action:** Review dynamically generated HTML strings to ensure inner event handler string syntax is correct using single quotes and wrap purely visual textual close symbols in `aria-hidden` tags.
