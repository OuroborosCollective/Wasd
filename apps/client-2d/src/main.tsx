import React from "react";
import ReactDOM from "react-dom/client";
import { CyberZenLoginGate } from "./CyberZenLoginGate";
import { DeterministicWorldIsoApp } from "./DeterministicWorldIsoApp";
import { LiveRealityBridge } from "./LiveRealityBridge";
import { MobileMovePad } from "./MobileMovePad";
import { PixiModuleInspector } from "./PixiModuleInspector";
import { WorldHeartMonitor } from "./WorldHeartMonitor";
import { KenneyUiLiveSkinBadge } from "./KenneyUiLiveSkinBadge";
import { InteractionOverlayRoot } from "./ui/InteractionOverlayRoot";
import { LootFeed } from "./ui/LootFeed";
import { ToastStack, type ClientToast } from "./ui/ToastStack";
import { NpcDialoguePanel } from "./ui/NpcDialoguePanel";
import { InteractionPrompt } from "./ui/InteractionPrompt";
import { createLootFeedStore, type LootFeedStore, type LootFeedEntry } from "./game/loot";
import { installClient2DDepthRuntime } from "./client2dDepthRuntime";
import { installViewportRuntime } from "./ViewportController";
import { ARELORIA_BOOT_CONFIG } from "./boot/boot.config";
import "./forestBiomeManifestBridge";
import "./client2dBootstrapNpcOverlay";
import "./theme.css";
import "./liveReality.css";
import "./worldHeart.css";
import "./pixiModuleInspector.css";
import "./mobilePlayability.css";
import "./mobileResponsive.css";
import "./kenneyUiLiveSkin.css";
import "./hudSafeZones.css";

installClient2DDepthRuntime();
installViewportRuntime();

/**
 * Fatal boot error display - prevents endless black screens
 */
function showFatalBootError(error: unknown): void {
  const root = document.getElementById("root");

  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);

  console.error("[Areloria Boot Fatal]", error);

  if (!root) {
    document.body.innerHTML = `<pre style="color:white;background:#070711;padding:24px;">${message}</pre>`;
    return;
  }

  root.innerHTML = `
    <div style="
      min-height:100dvh;
      display:grid;
      place-items:center;
      padding:24px;
      background:#070711;
      color:#f5f7ff;
      font-family:system-ui,sans-serif;
    ">
      <div style="
        max-width:520px;
        border:1px solid rgba(255,65,108,.4);
        border-radius:20px;
        padding:22px;
        background:rgba(255,65,108,.08);
      ">
        <h1 style="font-size:20px;margin-bottom:10px;">Areloria Boot Error</h1>
        <p style="opacity:.72;line-height:1.5;">
          Der REAL_PIXI_CLIENT konnte nicht starten.
        </p>
        <pre style="
          margin-top:16px;
          overflow:auto;
          white-space:pre-wrap;
          font-size:12px;
          opacity:.86;
        ">${message}</pre>
      </div>
    </div>
  `;
}

/**
 * Register service worker in production mode
 */
function registerServiceWorker(): void {
  if ("serviceWorker" in navigator && ARELORIA_BOOT_CONFIG.mode === "production") {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((error) => {
        console.warn("[Areloria SW] registration failed", error);
      });
  }
}

/**
 * Setup global error handlers
 */
function setupGlobalErrorHandlers(): void {
  // Window error handler
  window.addEventListener("error", (event) => {
    console.error("[Areloria Window Error]", event.error ?? event.message);
  });

  // Unhandled promise rejection handler
  window.addEventListener("unhandledrejection", (event) => {
    console.error("[Areloria Promise Rejection]", event.reason);
  });
}

// ─── UI Overlay Wrapper ─────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";

/** Wrapper component that renders floating UI overlays */
function UIOverlayLayer() {
  const [lootEntries, setLootEntries] = useState<LootFeedEntry[]>([]);
  const [toasts, setToasts] = useState<ClientToast[]>([]);
  const [dialogueActive, setDialogueActive] = useState<{ npcName: string; text: string } | null>(null);
  const [interactionTarget, setInteractionTarget] = useState<{ label: string } | null>(null);
  
  // Loot feed store (synced to component state)
  const lootFeedRef = useRef(createLootFeedStore(6));

  useEffect(() => {
    // Update loot feed periodically
    const lootInterval = setInterval(() => {
      setLootEntries([...lootFeedRef.current.getAll()]);
    }, 500);
    
    // Update toasts periodically (auto-dismiss after 5s)
    const toastInterval = setInterval(() => {
      const now = Date.now();
      setToasts(prev => prev.filter(t => now - t.createdAtMs < 5000));
    }, 1000);

    // Listen for UI events
    const handler = ((event: Event) => {
      const detail = (event as CustomEvent).detail;
      
      // Loot pickup
      if (detail?.event === "LOOT_PICKUP" || detail?.type === "loot_pickup") {
        const payload = detail.payload ?? detail;
        if (payload?.itemId) {
          lootFeedRef.current.push(payload.itemId, payload.quantity ?? 1);
          setLootEntries([...lootFeedRef.current.getAll()]);
        }
      }
      
      // Toast notifications
      if (detail?.event === "TOAST" || detail?.type === "toast") {
        const payload = detail.payload ?? detail;
        if (payload?.message) {
          const newToast: ClientToast = {
            id: `toast_${Date.now()}`,
            message: String(payload.message),
            severity: payload.severity ?? "info",
            createdAtMs: Date.now(),
          };
          setToasts(prev => [...prev.slice(-4), newToast]);
        }
      }
      
      // NPC Dialogue
      if (detail?.event === "npc_dialogue" || detail?.type === "npc_dialogue") {
        const payload = detail.payload ?? detail;
        setDialogueActive({
          npcName: String(payload.npcName ?? payload.name ?? "NPC"),
          text: String(payload.text ?? payload.message ?? ""),
        });
      }
      if (detail?.event === "DIALOGUE_CLOSE") {
        setDialogueActive(null);
      }
      
      // Interaction target
      if (detail?.event === "INTERACTION_TARGET" || detail?.type === "interaction_target") {
        const payload = detail.payload ?? detail;
        setInteractionTarget({ label: String(payload.label ?? "Interact") });
      }
      if (detail?.event === "INTERACTION_CLEAR") {
        setInteractionTarget(null);
      }
    }) as EventListener;
    
    window.addEventListener("wasd:network-packet", handler);
    
    return () => {
      clearInterval(lootInterval);
      clearInterval(toastInterval);
      window.removeEventListener("wasd:network-packet", handler);
    };
  }, []);

  return (
    <>
      <LootFeed entries={lootEntries} />
      <ToastStack toasts={toasts} />
      {dialogueActive && (
        <NpcDialoguePanel
          dialogue={{ active: dialogueActive }}
          onClose={() => setDialogueActive(null)}
        />
      )}
      {interactionTarget && (
        <InteractionPrompt
          target={interactionTarget}
          onInteract={() => {
            window.dispatchEvent(new CustomEvent("wasd:client-action", {
              detail: { action: "interact", payload: {} },
            }));
          }}
        />
      )}
    </>
  );
}

async function main(): Promise<void> {
  document.body.dataset.areloriaBoot = "mounting";

  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error("Missing #root element");
  }

  // Setup before rendering
  setupGlobalErrorHandlers();
  registerServiceWorker();

  // Render app
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <CyberZenLoginGate>
        <DeterministicWorldIsoApp />
        <LiveRealityBridge />
        <WorldHeartMonitor />
        <PixiModuleInspector />
        <MobileMovePad />
        <KenneyUiLiveSkinBadge />
        <InteractionOverlayRoot />
        <UIOverlayLayer />
      </CyberZenLoginGate>
    </React.StrictMode>
  );

  document.body.dataset.areloriaBoot = "mounted";
}

main().catch(showFatalBootError);
