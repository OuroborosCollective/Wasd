import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { CyberZenLoginGate } from "./CyberZenLoginGate";
import "./theme.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CyberZenLoginGate>
      <App />
    </CyberZenLoginGate>
  </React.StrictMode>
);
