// useGameplayPanels hook - Manages gameplay panel state with keyboard shortcuts
// Provides toggle functionality and keyboard event handling

import React from "react";
import type { GameplayPanelId } from "./GameplayPanelRegistry";
import { GAMEPLAY_PANEL_REGISTRY, getPanelByShortcut } from "./GameplayPanelRegistry";

function createInitialOpenPanels(): Set<GameplayPanelId> {
  return new Set(
    GAMEPLAY_PANEL_REGISTRY
      .filter((panel) => panel.defaultOpen)
      .map((panel) => panel.id),
  );
}

export function useGameplayPanels() {
  const [openPanels, setOpenPanels] = React.useState<Set<GameplayPanelId>>(
    createInitialOpenPanels,
  );

  const togglePanel = React.useCallback((panelId: GameplayPanelId) => {
    setOpenPanels((previous) => {
      const next = new Set(previous);

      if (next.has(panelId)) {
        next.delete(panelId);
      } else {
        next.add(panelId);
      }

      return next;
    });
  }, []);

  // Keyboard shortcuts for panels
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Skip if typing in an input field
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.key === "Escape") {
        setOpenPanels((prev) => (prev.size === 0 ? prev : new Set()));
        return;
      }

      const panel = getPanelByShortcut(event.key);
      if (!panel) return;

      event.preventDefault();
      togglePanel(panel.id);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePanel]);

  // Listen for custom toggle events from other parts of the app
  React.useEffect(() => {
    const onToggle = (event: Event) => {
      const detail = (event as CustomEvent).detail as { panelId?: GameplayPanelId; windowId?: GameplayPanelId };
      const panelId = detail?.panelId ?? detail?.windowId;

      if (panelId) {
        togglePanel(panelId);
      }
    };

    window.addEventListener("wasd:toggle-panel", onToggle);
    window.addEventListener("wasd:toggle-window", onToggle);

    return () => {
      window.removeEventListener("wasd:toggle-panel", onToggle);
      window.removeEventListener("wasd:toggle-window", onToggle);
    };
  }, [togglePanel]);

  // Listen for refresh events to update panels after data changes
  React.useEffect(() => {
    const onRefresh = (event: Event) => {
      // Currently we just listen - the snapshot is updated via liveGameplayStore
      // This listener can be used for future panel-specific updates
      console.debug("[GameplayPanels] Refresh event received", (event as CustomEvent).detail);
    };

    window.addEventListener("wasd:live-gameplay-refresh", onRefresh);
    return () => window.removeEventListener("wasd:live-gameplay-refresh", onRefresh);
  }, []);

  return {
    openPanels,
    togglePanel,
  };
}