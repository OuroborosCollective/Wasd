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
import { DnDProvider } from "./ui/dnd/DnDContext";
import { LootFeed } from "./ui/LootFeed";
import { ToastStack, type ClientToast } from "./ui/ToastStack";
import { NpcDialoguePanel } from "./ui/NpcDialoguePanel";
import { InteractionPrompt } from "./ui/InteractionPrompt";
import { ModuleRegistryPanel } from "./ModuleRegistryPanel";
import { SelfHealWorkshopPanel } from "./SelfHealWorkshopPanel";
import { createLootFeedStore, type LootFeedStore, type LootFeedEntry } from "./game/loot";
import { installClient2DDepthRuntime } from "./client2dDepthRuntime";
import { installViewportRuntime } from "./ViewportController";
import { ARELORIA_BOOT_CONFIG } from "./boot/boot.config";
import { LiveGameplayNetworkBridge } from "./game/LiveGameplayNetworkBridge";
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
import "./moduleRegistry.css";
import "./selfHealWorkshop.css";

installClient2DDepthRuntime();
installViewportRuntime();

/**
 * Fatal boot error display - prevents endless black screens
 * Shows visible error overlay when React fails to mount
 */
function showFatalBootError(error: unknown): void {
  const root = document.getElementById("root");

  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error ?? "Unknown boot error");

  const stack =
    error instanceof Error && error.stack
      ? error.stack
      : "";

  console.error("[Areloria Boot Fatal]", error);

  if (!root) {
    document.body.innerHTML = `<pre style="color:white;background:#070711;padding:24px;">${message}\n\n${stack}</pre>`;
    return;
  }

  // Escape HTML to prevent XSS in error display
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  root.innerHTML = `
    <main
      data-testid="boot-fatal-overlay"
      style="
        min-height:100dvh;
        display:grid;
        place-items:center;
        padding:24px;
        padding-top:calc(24px + env(safe-area-inset-top, 0px));
        padding-bottom:calc(24px + env(safe-area-inset-bottom, 0px));
        background:#070711;
        color:#f5f7ff;
        font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      "
    >
      <section style="
        max-width:560px;
        width:100%;
        border:1px solid rgba(255,65,108,.5);
        border-radius:20px;
        padding:24px;
        background:rgba(255,65,108,.1);
        box-shadow:0 0 48px rgba(255,65,108,.22);
      ">
        <h1 style="margin:0 0 8px;color:#ff416c;font-size:22px;">⚠️ Areloria Boot Fehler</h1>
        <p style="margin:0 0 16px;color:rgba(245,247,255,.72);line-height:1.5;">
          Der REAL_PIXI_CLIENT ist beim Starten abgestürzt.
        </p>
        <pre style="
          overflow:auto;
          max-height:40vh;
          padding:16px;
          border-radius:12px;
          background:#000;
          color:#ff9f7a;
          font-size:12px;
          line-height:1.5;
        ">${escapeHtml(message)}${stack ? "\n\n" + escapeHtml(stack) : ""}</pre>
        <p style="margin:16px 0 0;color:rgba(245,247,255,.5);font-size:11px;">
          Bitte Page neu laden oder Browser-Cache leeren.
        </p>
      </section>
    </main>
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
 * Setup global error handlers to catch boot-time crashes
 * Ensures any runtime error shows visible fatal overlay
 */
function setupGlobalErrorHandlers(): void {
  // Window error handler - catch runtime errors
  window.addEventListener("error", (event) => {
    const err = event.error ?? event.message;
    console.error("[Areloria Window Error]", err);
    // Show overlay if React hasn't mounted yet
    if (!document.body.dataset.areloriaBoot || document.body.dataset.areloriaBoot === "cold") {
      showFatalBootError(err);
    }
  });

  // Unhandled promise rejection handler
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    console.error("[Areloria Promise Rejection]", reason);
    // Show overlay if React hasn't mounted yet
    if (!document.body.dataset.areloriaBoot || document.body.dataset.areloriaBoot === "cold") {
      showFatalBootError(reason);
    }
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
  const [showRegistry, setShowRegistry] = useState(false);
  const [showWorkshop, setShowWorkshop] = useState(false);
  
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

    // Keyboard shortcuts
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      
      // M key - Module Registry
      if (e.key === "m" || e.key === "M") {
        setShowRegistry(prev => !prev);
      }
      // S key - SelfHeal Workshop
      if (e.key === "s" || e.key === "S") {
        setShowWorkshop(prev => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);

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
      window.removeEventListener("keydown", handleKeyDown);
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
      {showRegistry && (
        <div className="module-registry-overlay" onClick={() => setShowRegistry(false)}>
          <div className="module-registry-modal" onClick={e => e.stopPropagation()}>
            <button
              className="module-registry-close"
              onClick={() => setShowRegistry(false)}
              aria-label="Close Registry"
            >
              ×
            </button>
            <ModuleRegistryPanel />
          </div>
        </div>
      )}
      {showWorkshop && (
        <div className="module-registry-overlay" onClick={() => setShowWorkshop(false)}>
          <div className="module-registry-modal" onClick={e => e.stopPropagation()}>
            <button
              className="module-registry-close"
              onClick={() => setShowWorkshop(false)}
              aria-label="Close Workshop"
            >
              ×
            </button>
            <SelfHealWorkshopPanel />
          </div>
        </div>
      )}
    </>
  );
}

async function main(): Promise<void> {
  // Mark boot start for E2E testing
  document.body.dataset.areloriaBoot = "mounting";
  document.body.dataset.client2dBoot = "ok";
  document.body.dataset.postLoginShell = "waiting-for-entry";

  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error("Missing #root element");
  }

  // Setup error handlers BEFORE any code runs
  setupGlobalErrorHandlers();
  registerServiceWorker();

  // Remove the boot screen fallback once React mounts
  const bootScreen = document.getElementById("boot-screen");
  if (bootScreen) {
    bootScreen.remove();
  }

  // Render app with full error capture
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <DnDProvider>
          <CyberZenLoginGate>
            <DeterministicWorldIsoApp />
            <LiveRealityBridge />
            <WorldHeartMonitor />
            <PixiModuleInspector />
            <MobileMovePad />
            <KenneyUiLiveSkinBadge />
            <InteractionOverlayRoot />
            <UIOverlayLayer />
            <LiveGameplayNetworkBridge />
          </CyberZenLoginGate>
        </DnDProvider>
      </React.StrictMode>
    );

    // Success marker for E2E
    document.body.dataset.areloriaBoot = "mounted";
    document.body.dataset.client2dBoot = "ok";
  } catch (error) {
    document.body.dataset.areloriaBoot = "failed";
    document.body.dataset.client2dBoot = "failed";
    showFatalBootError(error);
  }
}

main().catch(showFatalBootError);
