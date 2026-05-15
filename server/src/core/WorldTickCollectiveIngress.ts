import { WorldTick } from "./WorldTick.js";
import { collectiveIngressRuntime } from "../collective/CollectiveIngressRuntime.js";

declare module "./WorldTick.js" {
  interface WorldTick {
    getCollectiveIngressStatus(): ReturnType<typeof collectiveIngressRuntime.getStatus>;
  }
}

WorldTick.prototype.getCollectiveIngressStatus = function getCollectiveIngressStatus() {
  return collectiveIngressRuntime.getStatus();
};

export function installWorldTickCollectiveIngress(): void {
  // Import side-effect installs the prototype method. This named function makes the intent explicit.
}
