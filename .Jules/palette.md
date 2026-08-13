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

## 2028-02-18 - [Standardizing Equipment Paperdoll Slots for Full Keyboard and Click UX Accessibility]
**Learning:** Paperdoll equipment slots with `role="button"` and `tabIndex={0}` are commonly implemented as simple card containers that fail to capture generic keyboard space/enter keydown triggers and only bind action callbacks to a nested visual unequip button. Standardizing these card items by moving the full `onClick` action up to the card element, intercepting keydown events for Enter/Space triggers, preventing event bubbling on child controls with `e.stopPropagation()`, and introducing dynamic screen-reader compatible `aria-label` attributes ensures keyboard accessibility and consistent click targets without modifying layout files or styling patterns.
**Action:** Always bind the click trigger directly on semantic button-like card container items, handle standard keyboard actions natively, and provide clear dynamic screen-reader descriptions specifying the equipment item name and slot destination.

## 2028-02-19 - [A11y with Interaction Hotkey Buttons and aria-keyshortcuts]
**Learning:** Floating interactive prompt elements (like the InteractionPrompt for triggering object interactions) display visual `<kbd>` hints (e.g., "E") but often lack the corresponding programmatic key-binding mapping for assistive technologies. Adding `aria-keyshortcuts="e"` guarantees screen-reader users are informed of the actual shortcut constraint natively.
**Action:** When designing or standardizing visual keybind badges or prompt cues, always expose the appropriate lowercase `aria-keyshortcuts` attribute on the focusable container or trigger button.

## 2028-02-20 - [Standardizing Skill Window with ESC Navigation, ARIA Attributes, and Low-Vitals Pulse Animations]
**Learning:** Standing HUD containers such as the SkillWindow can have purely visual progressbars and close buttons that aren't natively accessible. Wrapping visual progress bars in `role="progressbar"` with exact ARIA bounds and values ensures screen readers can parse player vital states correctly. Additionally, pairing this with a conditional, self-contained pulse animation class for HP/Stamina levels below 20% dramatically enhances situational awareness for sighted users without performance overhead.
**Action:** Always implement a dedicated Escape-key event listener on overlay modal panels to support keyboard dismissal, and accompany vital state progress bars with semantic progressbar attributes, dynamic tooltips, and non-blocking pulse animations for low thresholds.
