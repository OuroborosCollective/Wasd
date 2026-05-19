import React from "react";
import ReactDOM from "react-dom/client";
import { CyberZenLoginGate } from "./CyberZenLoginGate";
import { CyberZenIsoApp } from "./CyberZenIsoApp";
import "./theme.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CyberZenLoginGate>
      <CyberZenIsoApp />
    </CyberZenLoginGate>
  </React.StrictMode>
);
