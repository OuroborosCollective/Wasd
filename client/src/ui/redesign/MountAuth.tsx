import React from "react";
import { createRoot } from "react-dom/client";
import { AuthFlow } from "./AuthFlow";

export function mountAuthFlow(onComplete: (token: string, charName: string) => void) {
  const container = document.createElement("div");
  container.id = "auth-flow-root";
  document.body.appendChild(container);

  const root = createRoot(container);
  
  const handleComplete = (token: string, charName: string) => {
    localStorage.setItem("token", token);
    root.unmount();
    container.remove();
    onComplete(token, charName);
  };

  root.render(<AuthFlow onComplete={handleComplete} />);
}
