## 2025-05-15 - [Accessibility & Feedback in Status Bars]
**Learning:** Adding `role="progressbar"` with scaled ARIA values and a conditional `animate-pulse` class for low-health states provides both assistive technology support and better visual situational awareness without cluttering the UI. Semantic `<kbd>` tags should be used consistently for all keyboard shortcuts to maintain a high level of document structure.
**Action:** Always verify if status bars have ARIA roles and if low-state warnings (like <20% health) are visually indicated by animations. Use `<kbd>` for all single-key interaction hints.

## 2025-05-15 - [Accessibility in HUD Overlays]
**Learning:** HUD components in complex game interfaces often use purely decorative icons and custom-styled progress bars that are invisible to screen readers. Adding `role="progressbar"` with scaled ARIA values and marking decorative icons with `aria-hidden="true"` significantly improves the experience for assistive technology users without changing the visual design.
**Action:** Always verify that any visual "meter" or "bar" has a corresponding ARIA role and that all icon-only decorative elements are hidden from the accessibility tree.

## 2028-02-14 - [Quest Tracker Accessibility]
**Learning:** Progress bars in objective trackers are often purely visual. Implementing the WAI-ARIA `progressbar` pattern with `aria-valuetext` for percentage-based progress ensures that screen reader users can track mission objectives with the same precision as sighted players.
**Action:** Always wrap visual progress indicators in Quest or Objective trackers with `role="progressbar"` and provide both raw (`aria-valuenow`) and human-readable (`aria-valuetext`) progress values.

## 2028-02-15 - [Standardizing Quest Journal Panels with Accessibility and Close Button Patterns]
**Learning:** Standardizing Quest Journal elements to align with the rest of the application's close button and accessibility patterns ensures keyboard discoverability and screen-reader compatibility. Custom inline list elements for objective lists can be transformed into semantic progressive nodes using `role="progressbar"`, while standardizing the header close buttons using the global `.wow-close-btn` class maintains UI cohesion.
**Action:** Always verify if Quest Journal or tracker panels have a standardized close button pattern (`.wow-close-btn` class with `<kbd className="cz-kbd">ESC</kbd>`) and use semantic ARIA attributes for progress tracking components.

## 2028-02-16 - [Keyboard Navigation in Overlay Modal Views]
**Learning:** Custom HUD overlay panels (like camp trade exchange modals) often bypass the standard window wrapper controls, leading to isolated components that trap keyboard-only users. Attaching an ESC-keypress event listener directly within the component and styling the inline close element to display the semantic `<kbd className="cz-kbd">ESC</kbd>` hint provides visual and functional cohesion without disrupting the custom Diamond Glass aesthetics.
**Action:** Always implement local `keydown` window event listeners for Escape key actions in customized overlays, and decorate the close button with a `<kbd className="cz-kbd">ESC</kbd>` hint and matching `aria-keyshortcuts`.

## 2028-02-17 - [Interactive Shortcut Mapping & High-Situational Vitals Feedback]
**Learning:** Exposing programmatic mappings using `aria-keyshortcuts` on interactive HUD widgets (like menu tabs or skill bars) allows modern screen readers to dynamically map hotkeys to actions. Additionally, pairing these accessible markers with lightweight, non-blocking CSS pulse animations for critical states (such as low health/stamina) ensures high-fidelity situational awareness for both keyboard-only/sighted players and screen-reader users alike.
**Action:** Always complement visual hotkey indicators with structural `aria-keyshortcuts` attributes, and implement smooth pulsing visual transitions for status bars during low-vital conditions.

## 2028-02-18 - [Accessibility & Micro-UX Tooltips on Faction Standing Bars]
**Learning:** Sighted and non-sighted players alike find progress meters much easier to comprehend when detailed textual context is immediately discoverable. Adding both a standard hover `title` attribute for native tooltip discoverability and a semantic `aria-valuetext` representation ensures that the status, label, and exact progress of faction standings are fully accessible to screen reader users and mouse users without altering the graphical UI design.
**Action:** Always verify if custom faction standing or progress bar overlays implement the standard `title` and `aria-valuetext` combination, ensuring high usability and assistive compatibility.
