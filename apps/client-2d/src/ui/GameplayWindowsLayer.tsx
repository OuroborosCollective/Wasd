// Gameplay Windows Layer - Renders all registered gameplay panels
// Unified layer for all gameplay windows with consistent styling

import React from "react";
import type { GameplayPanelId } from "./GameplayPanelRegistry";
import type { LiveGameplaySnapshot } from "../game/liveGameplaySnapshot";

import { CharacterPaperdollRoot } from "./windows/CharacterPaperdollRoot";
import { QuestJournalPanel } from "./windows/QuestJournalPanel";
import { SkillProgressionPanel } from "./windows/SkillProgressionPanel";
import { ResourceNodePanel } from "./windows/ResourceNodePanel";
import { InventoryPanel } from "./windows/InventoryPanel";
import { CraftingWindow } from "./windows/CraftingWindow";
import { EquipmentPanel } from "./windows/EquipmentPanel";
import { ModuleRegistryPanel } from "../ModuleRegistryPanel";
import { AREHeartbeatPanel, DEFAULT_ARE_HEARTBEAT } from "../AREHeartbeatPanel";
import { SelfHealWorkshopPanel } from "../SelfHealWorkshopPanel";

interface Props {
  snapshot: LiveGameplaySnapshot;
  openPanels: ReadonlySet<GameplayPanelId>;
}

function WindowFrame({
  id,
  title,
  children,
  onClose,
}: {
  id: GameplayPanelId;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <section
      data-testid={`gameplay-window-${id}`}
      className={`gameplay-window gameplay-window--${id}`}
    >
      <header className="gameplay-window__header">
        <strong>{title}</strong>
        <button
          type="button"
          className="gameplay-window__close"
          onClick={onClose}
          aria-label={`Close ${title} [ESC]`}
          aria-keyshortcuts="Escape"
        >
          <kbd className="cz-kbd" aria-hidden="true">ESC</kbd>
          ✕
        </button>
      </header>
      <div className="gameplay-window__body">{children}</div>
    </section>
  );
}

export function GameplayWindowsLayer({ snapshot, openPanels }: Props) {
  // We need a way to toggle from here. While usually provided by useGameplayPanels,
  // we can just dispatch the same events that useGameplayPanels listens to.
  const toggle = (panelId: GameplayPanelId) => {
    window.dispatchEvent(
      new CustomEvent("wasd:toggle-panel", {
        detail: { panelId },
      }),
    );
  };

  return (
    <div data-testid="gameplay-windows-layer" className="gameplay-windows-layer">
      {openPanels.has("character") && (
        <WindowFrame id="character" title="Character" onClose={() => toggle("character")}>
          <CharacterPaperdollRoot snapshot={snapshot} defaultOpen />
        </WindowFrame>
      )}

      {openPanels.has("quests") && (
        <WindowFrame id="quests" title="Quest Journal" onClose={() => toggle("quests")}>
          <QuestJournalPanel snapshot={snapshot} />
        </WindowFrame>
      )}

      {openPanels.has("skills") && (
        <WindowFrame id="skills" title="Skills" onClose={() => toggle("skills")}>
          <SkillProgressionPanel skills={snapshot.skills ?? []} />
        </WindowFrame>
      )}

      {openPanels.has("resources") && (
        <WindowFrame id="resources" title="Resources" onClose={() => toggle("resources")}>
          <ResourceNodePanel resources={snapshot.resources ?? []} />
        </WindowFrame>
      )}

      {openPanels.has("inventory") && (
        <WindowFrame id="inventory" title="Inventory" onClose={() => toggle("inventory")}>
          <InventoryPanel
            inventory={snapshot.inventory ?? null}
            equipment={snapshot.equipment ?? null}
            wallet={snapshot.wallet}
            vendorEconomy={snapshot.vendorEconomy}
            equipmentStats={snapshot.equipmentStats}
          />
        </WindowFrame>
      )}

      {openPanels.has("crafting") && (
        <WindowFrame id="crafting" title="Crafting" onClose={() => toggle("crafting")}>
          <CraftingWindow crafting={snapshot.crafting ?? { recipes: [] }} />
        </WindowFrame>
      )}

      {openPanels.has("equipment") && (
        <WindowFrame id="equipment" title="Equipment" onClose={() => toggle("equipment")}>
          <EquipmentPanel
            equipment={snapshot.equipment ?? null}
            inventory={snapshot.inventory ?? null}
            paperdoll={snapshot.paperdoll ?? null}
          />
        </WindowFrame>
      )}

      {openPanels.has("modules") && (
        <WindowFrame id="modules" title="Modules" onClose={() => toggle("modules")}>
          <ModuleRegistryPanel />
        </WindowFrame>
      )}

      {openPanels.has("heartbeat") && (
        <WindowFrame id="heartbeat" title="ARE Heartbeat" onClose={() => toggle("heartbeat")}>
          <AREHeartbeatPanel
            snapshot={{
              tickId: snapshot.serverTick ?? null,
              kappa: null,
              observerCount: null,
              replayHash: null,
              serverTick: snapshot.serverTick ?? null,
              heartbeatStatus: snapshot.status === "live" ? "live" : "waiting",
              lastUpdated: null,
            }}
          />
        </WindowFrame>
      )}

      {openPanels.has("selfheal") && (
        <WindowFrame id="selfheal" title="SelfHeal" onClose={() => toggle("selfheal")}>
          <SelfHealWorkshopPanel />
        </WindowFrame>
      )}
    </div>
  );
}
