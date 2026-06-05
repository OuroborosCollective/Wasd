// React hook for LiveGameplaySnapshot
// Provides reactive access to server-authoritative gameplay data

import { useSyncExternalStore } from "react";
import { liveGameplayStore } from "./liveGameplayStore";

export function useLiveGameplaySnapshot() {
  return useSyncExternalStore(
    (listener) => liveGameplayStore.subscribe(listener),
    () => liveGameplayStore.getSnapshot(),
    () => liveGameplayStore.getSnapshot()
  );
}