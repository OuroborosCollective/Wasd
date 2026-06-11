import type { WorldTick as ThinShellWorldTick } from "./WorldTickThinShellAdapter.js";

declare global {
  type WorldTick = ThinShellWorldTick;
}

export {};
