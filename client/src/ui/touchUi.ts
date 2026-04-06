/** Shared mobile / coarse-pointer detection (mobile-first layouts). */

export function prefersCompactTouchUi(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(pointer: coarse)").matches) return true;
  if (window.innerWidth <= 720) return true;
  return false;
}

/** Chromium WebView / Android Chrome — often the strictest WebGL memory limits. */
export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

/** Prefer lower server sync rate + client perf heuristics (Android or coarse pointer / narrow viewport). */
export function wantsMobileNetworkHints(): boolean {
  return isAndroid() || prefersCompactTouchUi();
}
