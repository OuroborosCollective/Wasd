// LiveGameplayNetworkBridge
// Connects LiveGameplayStore to wasd:network-packet events and HTTP fallback
// Determinism: Pure display layer, no game logic

import { useEffect } from "react";
import { liveGameplayStore, fetchGameplaySnapshot } from "./liveGameplayStore";

export function LiveGameplayNetworkBridge(): null {
  useEffect(() => {
    let cancelled = false;
    // Track when we last received a network packet - polling pauses briefly after manual updates
    let lastManualUpdate = 0;
    const POLL_COOLDOWN_MS = 2000; // Don't poll within 2 seconds of manual update

    const networkHandler = (event: Event) => {
      liveGameplayStore.updateFromNetworkPacket(
        (event as CustomEvent).detail
      );
    };

    async function pollFallback() {
      // Skip polling if we recently did a manual update (e.g., after character creation)
      if (Date.now() - lastManualUpdate < POLL_COOLDOWN_MS) {
        return;
      }

      const currentSnapshot = liveGameplayStore.getSnapshot();
      const snapshot = await fetchGameplaySnapshot();

      if (cancelled || !snapshot) return;

      // FIX: Don't overwrite character data if we already have a character
      // This prevents the polling from reverting character creation
      if (currentSnapshot.character && !snapshot.character) {
        // Server snapshot doesn't have character but local does - preserve local
        liveGameplayStore.setSnapshot({
          ...snapshot,
          character: currentSnapshot.character,
          paperdoll: currentSnapshot.paperdoll,
        });
        return;
      }

      liveGameplayStore.setSnapshot(snapshot);
    }

    // Listen for manual updates (like character creation) to pause polling briefly
    const handleManualUpdate = () => {
      lastManualUpdate = Date.now();
    };
    window.addEventListener("wasd:live-gameplay-refresh", handleManualUpdate);
    window.addEventListener("wasd:character-created", handleManualUpdate);

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
      window.removeEventListener("wasd:live-gameplay-refresh", handleManualUpdate);
      window.removeEventListener("wasd:character-created", handleManualUpdate);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}