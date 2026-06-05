// LiveGameplayNetworkBridge
// Connects LiveGameplayStore to wasd:network-packet events and HTTP fallback
// Determinism: Pure display layer, no game logic

import { useEffect } from "react";
import { liveGameplayStore, fetchGameplaySnapshot } from "./liveGameplayStore";

export function LiveGameplayNetworkBridge(): null {
  useEffect(() => {
    let cancelled = false;

    const networkHandler = (event: Event) => {
      liveGameplayStore.updateFromNetworkPacket(
        (event as CustomEvent).detail
      );
    };

    async function pollFallback() {
      const snapshot = await fetchGameplaySnapshot();
      if (!cancelled && snapshot) {
        liveGameplayStore.setSnapshot(snapshot);
      }
    }

    window.addEventListener("wasd:network-packet", networkHandler);

    // Initial fetch as fallback
    void pollFallback();
    // Polling interval: 5 seconds (read-only, not simulation)
    const interval = window.setInterval(() => {
      void pollFallback();
    }, 5000);

    return () => {
      cancelled = true;
      window.removeEventListener("wasd:network-packet", networkHandler);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}