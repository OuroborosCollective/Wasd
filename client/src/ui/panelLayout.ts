import { prefersCompactTouchUi } from "./touchUi";

/**
 * Shared layout for game panels (inventory, skills, equipment, quest log).
 * Returns true if compact bottom-sheet layout was applied.
 */
export function applyGamePanelLayout(panel: HTMLElement): boolean {
  const compact = prefersCompactTouchUi();
  panel.style.position = "fixed";
  panel.style.zIndex = "1000";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.boxSizing = "border-box";

  if (compact) {
    panel.style.left = "0";
    panel.style.right = "0";
    panel.style.top = "auto";
    panel.style.bottom = "0";
    panel.style.transform = "none";
    panel.style.width = "100%";
    panel.style.maxWidth = "none";
    panel.style.height = "min(88vh, 100dvh)";
    panel.style.maxHeight = "min(88vh, 100dvh)";
    panel.style.borderRadius = "16px 16px 0 0";
    panel.style.paddingBottom = "max(12px, env(safe-area-inset-bottom, 0px))";
    panel.style.paddingLeft = "max(12px, env(safe-area-inset-left, 0px))";
    panel.style.paddingRight = "max(12px, env(safe-area-inset-right, 0px))";
    panel.style.paddingTop = "12px";
  } else {
    panel.style.left = "50%";
    panel.style.top = "50%";
    panel.style.transform = "translate(-50%, -50%)";
    panel.style.width = "90vw";
    panel.style.maxWidth = "400px";
    panel.style.height = "80vh";
    panel.style.maxHeight = "600px";
  }
  return compact;
}

export function panelCloseButtonStyles(compact: boolean): Partial<CSSStyleDeclaration> {
  return {
    padding: compact ? "10px 16px" : "6px 12px",
    minHeight: compact ? "44px" : "32px",
    fontSize: compact ? "14px" : "12px",
    touchAction: "manipulation",
  };
}
