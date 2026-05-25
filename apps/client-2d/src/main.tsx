import React from "react";
import ReactDOM from "react-dom/client";
import { CyberZenLoginGate } from "./CyberZenLoginGate";
import { CyberZenIsoApp } from "./CyberZenIsoApp";
import { LiveRealityBridge } from "./LiveRealityBridge";
import { MobileMovePad } from "./MobileMovePad";
import { WorldHeartMonitor } from "./WorldHeartMonitor";
import { installClient2DDepthRuntime } from "./client2dDepthRuntime";
import "./theme.css";
import "./liveReality.css";

installClient2DDepthRuntime();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CyberZenLoginGate>
      <CyberZenIsoApp />
      <LiveRealityBridge />
      <WorldHeartMonitor />
      <MobileMovePad />
    </CyberZenLoginGate>
  </React.StrictMode>
);
