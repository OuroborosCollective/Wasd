import { createRoot, type Root } from "react-dom/client";
import { useEffect, useState } from "react";
import { Hud } from "./Hud";
import { useGameHudState } from "./useGameHudState";
import {
  sendPickupLoot,
  sendSetCombatTarget,
  sendAttackWithOptionalTarget,
  requestQuestSync,
  sendUseSkill,
  sendUseItem,
} from "../networking/websocketClient";
import { getQuickCastSkillId } from "../game/combatSkills";
import { openInventory, openQuestLog } from "./lazyPanels";
import { renderCraftingUI } from "./crafting";
import { getCombatTargetNpcId, subscribePlayerState } from "../state/playerState";
import { setGameHudBridge } from "./gameHudBridge";

const OVERLAY_ID = "arel-game-hud-overlay";

let root: Root | null = null;

function GameHudApp() {
  const { youId, entities, loot, quests, inv, fxFeed, onServerMsg } = useGameHudState();
  const [connected, setConnected] = useState(false);
  const [targetId, setTargetId] = useState<string | undefined>(() => getCombatTargetNpcId() ?? undefined);

  useEffect(() => {
    setGameHudBridge({ onServerMsg });
    return () => setGameHudBridge(null);
  }, [onServerMsg]);

  useEffect(() => {
    const onNet = (ev: Event) => {
      const d = (ev as CustomEvent<{ kind?: string }>).detail;
      const kind = String(d?.kind ?? "");
      setConnected(kind === "connected" || kind === "login_sent" || kind === "welcome" || kind === "sync");
      if (kind === "closed" || kind === "error") setConnected(false);
    };
    window.addEventListener("areloria:net-status", onNet as EventListener);
    return () => window.removeEventListener("areloria:net-status", onNet as EventListener);
  }, []);

  useEffect(() => subscribePlayerState(() => setTargetId(getCombatTargetNpcId() ?? undefined)), []);

  const tryUseFirstPotion = () => {
    const rows = inv?.items ?? [];
    const potion = rows.find((r) => /potion|trank|heal/i.test(r.itemId));
    if (potion) sendUseItem(potion.itemId, 1);
  };

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.repeat) return;
      const t = ev.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (ev.code === "Digit1" || ev.key === "1") {
        ev.preventDefault();
        sendAttackWithOptionalTarget(targetId);
      }
      if (ev.code === "Digit2" || ev.key === "2") {
        ev.preventDefault();
        sendUseSkill(getQuickCastSkillId());
      }
      if (ev.code === "Digit3" || ev.key === "3") {
        ev.preventDefault();
        tryUseFirstPotion();
      }
      if (ev.code === "KeyI" || ev.key === "i" || ev.key === "I") {
        ev.preventDefault();
        void openInventory();
      }
      if (ev.code === "KeyQ" || ev.key === "q" || ev.key === "Q") {
        ev.preventDefault();
        requestQuestSync();
        void openQuestLog();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [targetId, inv]);

  return (
    <Hud
      connected={connected}
      youId={youId}
      entities={entities}
      loot={loot}
      inv={inv}
      quests={quests}
      targetId={targetId}
      onTarget={(id) => {
        setTargetId(id);
        sendSetCombatTarget(id ?? null);
      }}
      onAttack={() => sendAttackWithOptionalTarget(targetId)}
      onLootTake={(lootId) => sendPickupLoot(lootId)}
      onQuestPanel={() => {
        requestQuestSync();
        void openQuestLog();
      }}
      onInventoryOpen={() => void openInventory()}
      onSkill={() => sendUseSkill(getQuickCastSkillId())}
      onPotion={tryUseFirstPotion}
      onCraftOpen={() => {
        const el = renderCraftingUI();
        el.style.cssText =
          "position:fixed;inset:auto 12px 96px 12px;z-index:6500;max-width:420px;padding:12px;background:rgba(0,0,0,.85);color:#fff;border-radius:12px;border:1px solid rgba(255,255,255,.15)";
        document.body.appendChild(el);
        window.setTimeout(() => el.remove(), 5000);
      }}
      onHousingOpen={() => {
        void import("./toast").then((m) => m.showToast("Housing — demnächst."));
      }}
      fxFeed={fxFeed}
    />
  );
}

export function mountGameHudOverlay(): void {
  let host = document.getElementById(OVERLAY_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = OVERLAY_ID;
    document.body.appendChild(host);
  }
  if (!root) {
    root = createRoot(host);
  }
  root.render(<GameHudApp />);
}
