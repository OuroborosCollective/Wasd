import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { NewHud } from "./NewHud";
import { MasteryDashboard } from "./MasteryDashboard";
import { InventorySystem } from "./InventorySystem";
import { EquipmentPanel } from "./EquipmentPanel";
import { registerGameHudWsBridge } from "../gameHudBridge";
import { useGameHudState } from "../useGameHudState";
import type { MMORPGClientCore } from "../../core/MMORPGClientCore";
import {
  sendPickupLoot,
  sendSetCombatTarget,
} from "../../networking/websocketClient";
import {
  getCombatTargetNpcId,
  subscribePlayerState,
} from "../../state/playerState";

/**
 * Prop-Definitionen für die NewHud-Komponente zur Behebung von Typfehlern.
 */
export interface NewHudProps {
  connected: boolean;
  youId: string | null;
  entities: any[];
  loot: any[];
  quests: any[];
  targetId: string | undefined;
  onTarget: (id: string | undefined) => void;
  onAttack: () => void;
  onLootTake: (lootId: string) => void;
  onCraftOpen: () => void;
  onHousingOpen: () => void;
  fxFeed: any[];
  warfront: any;
  onMenuOpen: (panel: string) => void;
}

export function mountNewHud(core: MMORPGClientCore) {
  let rootEl = document.getElementById("new-game-hud-react-root");
  if (!rootEl) {
    rootEl = document.createElement("div");
    rootEl.id = "new-game-hud-react-root";
    document.body.appendChild(rootEl);
  }

  const root = createRoot(rootEl);

  function NewHudApp() {
    const coreRef = useRef(core);

    const {
      youId,
      entities,
      loot,
      quests,
      inv,
      fxFeed,
      warfront,
      onWirePayload,
      onEntitySync,
      onLootSpawned,
      onLootDespawned,
    } = useGameHudState();

    const [connected, setConnected] = useState(false);
    const [targetId, setTargetId] = useState<string | undefined>();
    const [activePanel, setActivePanel] = useState<string | null>(null);

    useEffect(() => {
      registerGameHudWsBridge({
        onEntitySync: onEntitySync || (() => {}),
        onLootSpawned: onLootSpawned || (() => {}),
        onLootDespawned: onLootDespawned || (() => {}),
        onProtocolMsg: (msg: unknown) => {
          if (msg && typeof msg === "object" && onWirePayload) {
            onWirePayload(msg as Record<string, unknown>);
          }
        },
        onGameConnected: setConnected,
      });
      return () => registerGameHudWsBridge(null);
    }, [onEntitySync, onLootSpawned, onLootDespawned, onWirePayload]);

    useEffect(() => {
      const syncTarget = () => {
        const id = getCombatTargetNpcId();
        setTargetId(id && id.length > 0 ? id : undefined);
      };
      syncTarget();
      return subscribePlayerState(syncTarget);
    }, []);

    const onTarget = useCallback((id: string | undefined) => {
      setTargetId(id);
      sendSetCombatTarget(id ?? "");
    }, []);

    const onAttack = useCallback(() => {
      coreRef.current.attack();
    }, []);

    const onLootTake = useCallback((lootId: string) => {
      sendPickupLoot(lootId);
    }, []);

    const onMenuOpen = useCallback((panel: string) => {
      setActivePanel(prev => (prev === panel ? null : panel));
    }, []);

    useEffect(() => {
      const handleCloseAll = () => setActivePanel(null);
      const handleOpenPanel = (e: any) => {
        if (e.detail?.panel) setActivePanel(e.detail.panel);
      };

      window.addEventListener("areloria:close-all-panels", handleCloseAll);
      window.addEventListener("areloria:open-panel", handleOpenPanel);

      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") setActivePanel(null);
      };
      window.addEventListener("keydown", handleEsc);

      return () => {
        window.removeEventListener("keydown", handleEsc);
        window.removeEventListener("areloria:close-all-panels", handleCloseAll);
        window.removeEventListener("areloria:open-panel", handleOpenPanel);
      };
    }, []);

    return (
      <>
        <NewHud
          connected={connected}
          youId={youId}
          entities={entities}
          loot={loot}
          quests={quests}
          targetId={targetId}
          onTarget={onTarget}
          onAttack={onAttack}
          onLootTake={onLootTake}
          onCraftOpen={() => {}}
          onHousingOpen={() => {}}
          fxFeed={fxFeed}
          warfront={warfront}
          onMenuOpen={onMenuOpen}
          inventoryOpen={activePanel === "inventory"}
          toggleInventory={() => onMenuOpen("inventory")}
        />
        {(activePanel === "stats" || activePanel === "skills") && (
          <MasteryDashboard onClose={() => setActivePanel(null)} />
        )}
        {activePanel === "inventory" && (
          <InventorySystem onClose={() => setActivePanel(null)} />
        )}
        {activePanel === "equipment" && (
          <EquipmentPanel onClose={() => setActivePanel(null)} />
        )}
      </>
    );
  }

  root.render(<NewHudApp />);
}
