/** Shared mobile / coarse-pointer detection (mobile-first layouts). */

export type DeviceTier = "smartphone" | "tablet" | "desktop";

export function getDeviceTier(): DeviceTier {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (width < 600) return "smartphone";
  if (width <= 1024) return "tablet";
  return "desktop";
}

export function prefersCompactTouchUi(): boolean {
  if (typeof window === "undefined") return false;
  const tier = getDeviceTier();
  if (tier === "smartphone") return true;
  if (window.matchMedia("(pointer: coarse)").matches) return true;
  // For tablet, we might still want compact UI in some cases, 
  // but the redesign specifically has tablet-optimized layouts.
  // The old code used 720px. 
  return window.innerWidth <= 720;
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
