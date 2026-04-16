import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Hud } from "./Hud";
import { useGameHudState } from "./useGameHudState";
import { initGameHudStore } from "./gameHudStore";
import { sendCommand, sendPickupLoot, sendSetCombatTarget } from "../networking/websocketClient";
import { openInventory, openQuestLog } from "./lazyPanels";
import { showToast } from "./toast";

function GameHudRoot() {
  const s = useGameHudState();

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.repeat) return;
      const t = ev.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (ev.key === "1") {
        ev.preventDefault();
        sendCommand("attack", {});
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Hud
      connected={s.connected}
      youId={s.youId}
      entities={s.entities}
      loot={s.loot}
      inv={s.inv}
      quests={s.quests}
      targetId={s.targetId}
      onTarget={(id) => sendSetCombatTarget(id ?? null)}
      onAttack={() => sendCommand("attack", {})}
      onLootTake={(lootId) => sendPickupLoot(lootId)}
      onCraftOpen={() => {
        void import("./crafting").then((m) => m.renderCraftingUI()).catch(() => showToast("Crafting UI nicht verfügbar."));
      }}
      onHousingOpen={() => showToast("Housing folgt später.")}
      onInventoryOpen={() => void openInventory()}
      onQuestLogOpen={() => void openQuestLog()}
      fxFeed={s.fxFeed}
    />
  );
}

export function mountGameHudOverlay() {
  if (typeof document === "undefined") return;
  initGameHudStore();
  let host = document.getElementById("arel-game-hud");
  if (!host) {
    host = document.createElement("div");
    host.id = "arel-game-hud";
    document.body.appendChild(host);
  }
  const root = createRoot(host);
  root.render(
    <React.StrictMode>
      <GameHudRoot />
    </React.StrictMode>
  );
}
