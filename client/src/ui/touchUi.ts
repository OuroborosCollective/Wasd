/** Shared mobile / coarse-pointer detection (mobile-first layouts). */

export function prefersCompactTouchUi(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(pointer: coarse)").matches) return true;
  if (window.innerWidth <= 720) return true;
  return false;
}
