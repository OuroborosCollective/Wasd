import { requestSceneChange } from "../networking/websocketClient";

export function renderMobileSceneTeleportPanel() {
  const isLikelyTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  if (!isLikelyTouchDevice) {
    return;
  }

  const existing = document.getElementById("mobile-scene-teleport-panel");
  if (existing) {
    return;
  }

  const panel = document.createElement("div");
  panel.id = "mobile-scene-teleport-panel";
  panel.style.position = "fixed";
  panel.style.right = "10px";
  panel.style.bottom = "170px";
  panel.style.zIndex = "2500";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.gap = "6px";
  panel.style.background = "rgba(10, 10, 14, 0.85)";
  panel.style.border = "1px solid rgba(255,255,255,0.16)";
  panel.style.borderRadius = "10px";
  panel.style.padding = "8px";
  panel.style.backdropFilter = "blur(4px)";

  const title = document.createElement("div");
  title.textContent = "Quick Port";
  title.style.color = "#cdd6f4";
  title.style.fontFamily = "sans-serif";
  title.style.fontSize = "11px";
  title.style.textTransform = "uppercase";
  title.style.letterSpacing = "0.8px";
  title.style.opacity = "0.85";
  panel.appendChild(title);

  const makeButton = (label: string, spawnKey: string, accent: string) => {
    const button = document.createElement("button");
    button.textContent = label;
    button.style.border = "none";
    button.style.borderRadius = "8px";
    button.style.padding = "8px 10px";
    button.style.fontFamily = "sans-serif";
    button.style.fontSize = "12px";
    button.style.fontWeight = "700";
    button.style.color = "#fff";
    button.style.background = accent;
    button.style.cursor = "pointer";
    button.style.minWidth = "102px";
    button.onclick = () => requestSceneChange("didis_hub", spawnKey);
    return button;
  };

  panel.appendChild(makeButton("Hub", "sp_player_default", "#4c6ef5"));
  panel.appendChild(makeButton("Didi 1", "sp_didi_01", "#2f9e44"));
  panel.appendChild(makeButton("Didi 2", "sp_didi_02", "#e67700"));

  document.body.appendChild(panel);
}
