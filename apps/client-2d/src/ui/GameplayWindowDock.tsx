// Gameplay Window Dock - Visible dock for toggling gameplay panels
// Shows all registered panels as buttons with keyboard shortcuts

import React from "react";
import type { GameplayPanelId } from "./GameplayPanelRegistry";
import { GAMEPLAY_PANEL_REGISTRY } from "./GameplayPanelRegistry";

interface Props {
  openPanels: ReadonlySet<GameplayPanelId>;
  onToggle: (panelId: GameplayPanelId) => void;
}

export function GameplayWindowDock({ openPanels, onToggle }: Props) {
  return (
    <nav
      data-testid="gameplay-window-dock"
      className="gameplay-window-dock"
      aria-label="Gameplay windows"
    >
      {GAMEPLAY_PANEL_REGISTRY.map((panel) => {
        const active = openPanels.has(panel.id);

        return (
          <button
            key={panel.id}
            type="button"
            data-testid={`panel-toggle-${panel.id}`}
            className={active ? "gameplay-window-dock__button is-active" : "gameplay-window-dock__button"}
            aria-pressed={active}
            onClick={() => onToggle(panel.id)}
            title={`${panel.title} (${panel.shortcut})`}
          >
            <span>{panel.title}</span>
            <kbd>{panel.shortcut}</kbd>
          </button>
        );
      })}
    </nav>
  );
}