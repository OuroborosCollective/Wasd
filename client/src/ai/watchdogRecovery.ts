/**
 * Whitelisted recovery routines for the AI watchdog — no generated code, module-scoped only.
 */
import { QUICK_CAST_SKILL_STORAGE_KEY } from "../game/combatSkills";

const GUEST_KEY = "areloria_guest_id";

export function clearStaleWsTokenOnly(): void {
  try {
    localStorage.removeItem("token");
  } catch {
    /* ignore */
  }
}

export function clearGameLocalStorageKeys(): void {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem(GUEST_KEY);
    localStorage.removeItem(QUICK_CAST_SKILL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Clear GPU/shader caches if Babylon scene is on window (best-effort after WebGL hiccups). */
export function babylonSoftRecover(): void {
  try {
    const scene = (window as unknown as { babylonScene?: { getEngine?: () => { wipeCaches?: (b: boolean) => void } } })
      .babylonScene;
    const engine = scene?.getEngine?.();
    engine?.wipeCaches?.(true);
  } catch {
    /* ignore */
  }
}

/** Lower GPU load when renderer errors suggest overload (best-effort). */
export function babylonReduceRenderLoad(): void {
  try {
    const scene = (window as unknown as {
      babylonScene?: { getEngine?: () => { setHardwareScalingLevel?: (n: number) => void } };
    }).babylonScene;
    const engine = scene?.getEngine?.();
    if (engine && typeof engine.setHardwareScalingLevel === "function") {
      engine.setHardwareScalingLevel(2.75);
    }
  } catch {
    /* ignore */
  }
}
