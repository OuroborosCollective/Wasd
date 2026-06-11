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
import { StitchAssetGalleryPanel } from "./ui/StitchAssetGalleryPanel";
import { StitchAssetPreviewPanel } from "./ui/windows/StitchAssetPreviewPanel";
import { ModuleRegistryPanel } from "./ModuleRegistryPanel";
import { SelfHealWorkshopPanel } from "./SelfHealWorkshopPanel";
import { createLootFeedStore, type LootFeedEntry } from "./game/loot";
import { installClient2DDepthRuntime } from "./client2dDepthRuntime";
import { installViewportRuntime } from "./ViewportController";
import { ARELORIA_BOOT_CONFIG } from "./boot/boot.config";
import { LiveGameplayNetworkBridge } from "./game/LiveGameplayNetworkBridge";
import { useState, useEffect, useRef } from "react";
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
import "./ui/stitchAssetGallery.css";
import "./ui/windows/stitchAssetPreviewPanel.css";

installClient2DDepthRuntime();
installViewportRuntime();

const ENABLE_PUBLIC_DEBUG_PANELS = ARELORIA_BOOT_CONFIG.design.showDebugHud;
const ENABLE_STITCH_PREVIEW_PANEL =
  ENABLE_PUBLIC_DEBUG_PANELS || import.meta.env.VITE_ENABLE_STITCH_PREVIEW_PANEL === "1";

function hasStitchPreviewUrlRequest(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("stitchPreview") === "1" || window.location.hash === "#stitch-preview";
  } catch {
    return false;
  }
}

function showFatalBootError(error: unknown): void {
  const root = document.getElementById("root");
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? "Unknown boot error");
  const stack = error instanceof Error && error.stack ? error.stack : "";
  console.error("[Areloria Boot Fatal]", error);
  if (!root) {
    document.body.innerHTML = `<pre style="color:white;background:#070711;padding:24px;">${message}\n\n${stack}</pre>`;
    return;
  }
  const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  root.innerHTML = `
    <main data-testid="boot-fatal-overlay" style="min-height:100dvh;display:grid;place-items:center;padding:24px;background:#070711;color:#f5f7ff;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <section style="max-width:560px;width:100%;border:1px solid rgba(255,65,108,.5);border-radius:20px;padding:24px;background:rgba(255,65,108,.1);box-shadow:0 0 48px rgba(255,65,108,.22);">
        <h1 style="margin:0 0 8px;color:#ff416c;font-size:22px;">⚠️ Areloria Boot Fehler</h1>
        <p style="margin:0 0 16px;color:rgba(245,247,255,.72);line-height:1.5;">Der REAL_PIXI_CLIENT ist beim Starten abgestürzt.</p>
        <pre style="overflow:auto;max-height:40vh;padding:16px;border-radius:12px;background:#000;color:#ff9f7a;font-size:12px;line-height:1.5;">${escapeHtml(message)}${stack ? "\n\n" + escapeHtml(stack) : ""}</pre>
      </section>
    </main>`;
}

function registerServiceWorker(): void {
  if ("serviceWorker" in navigator && ARELORIA_BOOT_CONFIG.mode === "production") {
    navigator.serviceWorker.register("/service-worker.js").catch((error) => {
      console.warn("[Areloria SW] registration failed", error);
    });
  }
}

function setupGlobalErrorHandlers(): void {
  window.addEventListener("error", (event) => {
    const err = event.error ?? event.message;
    console.error("[Areloria Window Error]", err);
    if (!document.body.dataset.areloriaBoot || document.body.dataset.areloriaBoot === "cold") showFatalBootError(err);
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    console.error("[Areloria Promise Rejection]", reason);
    if (!document.body.dataset.areloriaBoot || document.body.dataset.areloriaBoot === "cold") showFatalBootError(reason);
  });
}

function UIOverlayLayer() {
  const [lootEntries, setLootEntries] = useState<LootFeedEntry[]>([]);
  const [toasts, setToasts] = useState<ClientToast[]>([]);
  const [dialogueActive, setDialogueActive] = useState<{ npcName: string; text: string } | null>(null);
  const [interactionTarget, setInteractionTarget] = useState<{ label: string } | null>(null);
  const [showRegistry, setShowRegistry] = useState(false);
  const [showWorkshop, setShowWorkshop] = useState(false);
  const [showStitchGallery, setShowStitchGallery] = useState(false);
  const [showStitchPreview, setShowStitchPreview] = useState(() => ENABLE_STITCH_PREVIEW_PANEL && hasStitchPreviewUrlRequest());
  const lootFeedRef = useRef(createLootFeedStore(6));

  useEffect(() => {
    const lootInterval = setInterval(() => setLootEntries([...lootFeedRef.current.getAll()]), 500);
    const toastInterval = setInterval(() => {
      const now = Date.now();
      setToasts((prev) => prev.filter((t) => now - t.createdAtMs < 5000));
    }, 1000);

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (!ENABLE_PUBLIC_DEBUG_PANELS) return;
      if (e.key === "m" || e.key === "M") setShowRegistry((prev) => !prev);
      if (e.key === "s" || e.key === "S") setShowWorkshop((prev) => !prev);
      if (e.key === "a" || e.key === "A") setShowStitchGallery((prev) => !prev);
      if (ENABLE_STITCH_PREVIEW_PANEL && (e.key === "p" || e.key === "P")) setShowStitchPreview((prev) => !prev);
    }
    window.addEventListener("keydown", handleKeyDown);

    const openStitchPreview = () => {
      if (ENABLE_STITCH_PREVIEW_PANEL) setShowStitchPreview(true);
    };
    window.addEventListener("wasd:open-stitch-preview", openStitchPreview);

    const handler = ((event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.event === "LOOT_PICKUP" || detail?.type === "loot_pickup") {
        const payload = detail.payload ?? detail;
        if (payload?.itemId) {
          lootFeedRef.current.push(payload.itemId, payload.quantity ?? 1);
          setLootEntries([...lootFeedRef.current.getAll()]);
        }
      }
      if (detail?.event === "TOAST" || detail?.type === "toast") {
        const payload = detail.payload ?? detail;
        if (payload?.message) {
          setToasts((prev) => [...prev.slice(-4), { id: `toast_${Date.now()}`, message: String(payload.message), severity: payload.severity ?? "info", createdAtMs: Date.now() }]);
        }
      }
      if (detail?.event === "npc_dialogue" || detail?.type === "npc_dialogue") {
        const payload = detail.payload ?? detail;
        setDialogueActive({ npcName: String(payload.npcName ?? payload.name ?? "NPC"), text: String(payload.text ?? payload.message ?? "") });
      }
      if (detail?.event === "DIALOGUE_CLOSE") setDialogueActive(null);
      if (detail?.event === "INTERACTION_TARGET" || detail?.type === "interaction_target") {
        const payload = detail.payload ?? detail;
        setInteractionTarget({ label: String(payload.label ?? "Interact") });
      }
      if (detail?.event === "INTERACTION_CLEAR") setInteractionTarget(null);
    }) as EventListener;
    window.addEventListener("wasd:network-packet", handler);

    return () => {
      clearInterval(lootInterval);
      clearInterval(toastInterval);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wasd:open-stitch-preview", openStitchPreview);
      window.removeEventListener("wasd:network-packet", handler);
    };
  }, []);

  return (
    <>
      <LootFeed entries={lootEntries} />
      <ToastStack toasts={toasts} />
      {dialogueActive && <NpcDialoguePanel dialogue={{ active: dialogueActive }} onClose={() => setDialogueActive(null)} />}
      {interactionTarget && (
        <InteractionPrompt
          target={interactionTarget}
          onInteract={() => window.dispatchEvent(new CustomEvent("wasd:client-action", { detail: { action: "interact", payload: {} } }))}
        />
      )}
      {ENABLE_PUBLIC_DEBUG_PANELS && showRegistry && (
        <div className="module-registry-overlay" onClick={() => setShowRegistry(false)}>
          <div className="module-registry-modal" onClick={(e) => e.stopPropagation()}>
            <button className="module-registry-close" onClick={() => setShowRegistry(false)} aria-label="Close Registry">×</button>
            <ModuleRegistryPanel />
          </div>
        </div>
      )}
      {ENABLE_PUBLIC_DEBUG_PANELS && showWorkshop && (
        <div className="module-registry-overlay" onClick={() => setShowWorkshop(false)}>
          <div className="module-registry-modal" onClick={(e) => e.stopPropagation()}>
            <button className="module-registry-close" onClick={() => setShowWorkshop(false)} aria-label="Close Workshop">×</button>
            <SelfHealWorkshopPanel />
          </div>
        </div>
      )}
      {ENABLE_PUBLIC_DEBUG_PANELS && showStitchGallery && (
        <div className="module-registry-overlay" onClick={() => setShowStitchGallery(false)}>
          <div className="module-registry-modal" onClick={(e) => e.stopPropagation()}>
            <button className="module-registry-close" onClick={() => setShowStitchGallery(false)} aria-label="Close Stitch Asset Gallery">×</button>
            <StitchAssetGalleryPanel />
          </div>
        </div>
      )}
      {ENABLE_STITCH_PREVIEW_PANEL && showStitchPreview && (
        <div className="module-registry-overlay" onClick={() => setShowStitchPreview(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <button className="module-registry-close" onClick={() => setShowStitchPreview(false)} aria-label="Close Stitch Asset Preview">×</button>
            <StitchAssetPreviewPanel />
          </div>
        </div>
      )}
      {ENABLE_STITCH_PREVIEW_PANEL && !showStitchPreview && (
        <button
          className="module-registry-floating-dev-button"
          type="button"
          onClick={() => setShowStitchPreview(true)}
          aria-label="Open Stitch Preview"
          data-testid="stitch-preview-dev-open"
        >
          Stitch Preview
        </button>
      )}
    </>
  );
}

async function main(): Promise<void> {
  document.body.dataset.areloriaBoot = "mounting";
  document.body.dataset.client2dBoot = "ok";
  document.body.dataset.postLoginShell = "waiting-for-entry";
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Missing #root element");
  setupGlobalErrorHandlers();
  registerServiceWorker();
  document.getElementById("boot-screen")?.remove();

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
      </React.StrictMode>,
    );
    document.body.dataset.areloriaBoot = "mounted";
    document.body.dataset.client2dBoot = "ok";
  } catch (error) {
    document.body.dataset.areloriaBoot = "failed";
    document.body.dataset.client2dBoot = "failed";
    showFatalBootError(error);
  }
}

main().catch(showFatalBootError);
