import React from "react";
import ReactDOM from "react-dom/client";
import { CyberZenLoginGate } from "./CyberZenLoginGate";
import { DeterministicWorldIsoApp } from "./DeterministicWorldIsoApp";
import { LiveRealityBridge } from "./LiveRealityBridge";
import { MobileMovePad } from "./MobileMovePad";
import { PixiModuleInspector } from "./PixiModuleInspector";
import { WorldHeartMonitor } from "./WorldHeartMonitor";
import { KenneyUiLiveSkinBadge } from "./KenneyUiLiveSkinBadge";
import { installClient2DDepthRuntime } from "./client2dDepthRuntime";
import { installViewportRuntime } from "./ViewportController";
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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CyberZenLoginGate>
      <DeterministicWorldIsoApp />
      <LiveRealityBridge />
      <WorldHeartMonitor />
      <PixiModuleInspector />
      <MobileMovePad />
      <KenneyUiLiveSkinBadge />
    </CyberZenLoginGate>
  </React.StrictMode>
);
