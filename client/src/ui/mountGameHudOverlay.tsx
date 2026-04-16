import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Hud } from "./Hud";
import { registerGameHudWsBridge } from "./gameHudBridge";
import { useGameHudState } from "./useGameHudState";
import type { MMORPGClientCore } from "../core/MMORPGClientCore";
import { sendPickupLoot, sendSetCombatTarget } from "../networking/websocketClient";
import { getCombatTargetNpcId, subscribePlayerState } from "../state/playerState";
import { getQuestlineSnapshot, subscribeQuestlineState } from "../state/questlineState";
import { showToast } from "./toast";
import { showRandomWorldFragmentToast } from "./worldFragmentToast";

export function mountGameHudOverlay(core: MMORPGClientCore) {
  let rootEl = document.getElementById("game-hud-react-root");
  if (!rootEl) {
    rootEl = document.createElement("div");
    rootEl.id = "game-hud-react-root";
    document.body.appendChild(rootEl);
  }

  const root = createRoot(rootEl);

  function GameHudApp() {
    const coreRef = useRef(core);
    coreRef.current = core;

    const {
      youId,
      entities,
      loot,
      quests,
      inv,
      fxFeed,
      onWirePayload,
      onEntitySync,
      onLootSpawned,
      onLootDespawned,
    } = useGameHudState();

    const [connected, setConnected] = useState(false);
    const [targetId, setTargetId] = useState<string | undefined>();
    const [, setQuestlineTick] = useState(0);
    const loreToastPendingRef = useRef(false);

    useEffect(() => {
      return subscribeQuestlineState(() => setQuestlineTick((n) => n + 1));
    }, []);

    useEffect(() => {
      if (!connected) {
        loreToastPendingRef.current = false;
        return;
      }
      if (loreToastPendingRef.current) return;
      loreToastPendingRef.current = true;
      void showRandomWorldFragmentToast(showToast);
    }, [connected]);

    useEffect(() => {
      registerGameHudWsBridge({
        onEntitySync,
        onLootSpawned,
        onLootDespawned,
        onProtocolMsg: onWirePayload,
        onGameConnected: setConnected,
      });
      return () => registerGameHudWsBridge(null);
    }, [onEntitySync, onLootSpawned, onLootDespawned, onWirePayload]);

    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.repeat) return;
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        if (e.key === "1" || e.key === "Digit1") {
          coreRef.current.attack();
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);

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

    const onCraftOpen = useCallback(() => {
      void import("./crafting").then((m) => m.renderCraftingUI()).catch(() => showToast("Crafting"));
    }, []);

    const onHousingOpen = useCallback(() => {
      showToast("Housing: platziere Items über den Server-Befehl house_place (Demo).");
    }, []);

    const ql = getQuestlineSnapshot();
    const qlProgress =
      ql && ql.featureSchedule.length > 0
        ? `${ql.featureSchedule.filter((r) => r.satisfied).length}/${ql.featureSchedule.length} Features · Node ${ql.currentNode}`
        : null;

    return (
      <Hud
        connected={connected}
        youId={youId}
        entities={entities}
        loot={loot}
        inv={inv}
        quests={quests}
        targetId={targetId}
        onTarget={onTarget}
        onAttack={onAttack}
        onLootTake={onLootTake}
        onCraftOpen={onCraftOpen}
        onHousingOpen={onHousingOpen}
        fxFeed={fxFeed}
        questlineProgress={qlProgress}
      />
    );
  }

  root.render(<GameHudApp />);
}
