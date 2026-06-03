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
      </CyberZenLoginGate>
    </React.StrictMode>
  );

  document.body.dataset.areloriaBoot = "mounted";
}

main().catch(showFatalBootError);
