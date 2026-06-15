// LiveGameplayNetworkBridge
// Connects LiveGameplayStore to wasd:network-packet events and HTTP fallback
// Determinism: Pure display layer, no game logic

import { useEffect } from "react";
import { liveGameplayStore, fetchGameplaySnapshot } from "./liveGameplayStore";

export function LiveGameplayNetworkBridge(): null {
  useEffect(() => {
    let cancelled = false;
    let pollSequence = 0;
    let lastManualUpdatePollSequence = -999;
    const POLL_COOLDOWN_CYCLES = 1;

    const networkHandler = (event: Event) => {
      liveGameplayStore.updateFromNetworkPacket(
        (event as CustomEvent).detail
      );
    };

    async function pollFallback() {
      pollSequence += 1;
      if (pollSequence - lastManualUpdatePollSequence <= POLL_COOLDOWN_CYCLES) {
        return;
      }

      const currentSnapshot = liveGameplayStore.getSnapshot();
      const snapshot = await fetchGameplaySnapshot();

      if (cancelled || !snapshot) return;

      if (currentSnapshot.character && !snapshot.character) {
        liveGameplayStore.setSnapshot({
          ...snapshot,
          character: currentSnapshot.character,
          paperdoll: currentSnapshot.paperdoll,
        });
        return;
      }

      liveGameplayStore.setSnapshot(snapshot);
    }

    const handleManualUpdate = () => {
      lastManualUpdatePollSequence = pollSequence;
    };
    window.addEventListener("wasd:live-gameplay-refresh", handleManualUpdate);
    window.addEventListener("wasd:character-created", handleManualUpdate);

    window.addEventListener("wasd:network-packet", networkHandler);

    void pollFallback();
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
