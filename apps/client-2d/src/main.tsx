import React from "react";
import ReactDOM from "react-dom/client";
import { CyberZenLoginGate } from "./CyberZenLoginGate";
import { CyberZenIsoApp } from "./CyberZenIsoApp";
import { LiveRealityBridge } from "./LiveRealityBridge";
import { MobileMovePad } from "./MobileMovePad";
import "./theme.css";
import "./liveReality.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CyberZenLoginGate>
      <CyberZenIsoApp />
      <LiveRealityBridge />
      <MobileMovePad />
    </CyberZenLoginGate>
  </React.StrictMode>
);
