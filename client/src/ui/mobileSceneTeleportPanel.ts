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
  panel.style.display = "none";
  panel.style.flexDirection = "column";
  panel.style.gap = "6px";
  panel.style.background = "rgba(10, 10, 14, 0.85)";
  panel.style.border = "1px solid rgba(255,255,255,0.16)";
  panel.style.borderRadius = "10px";
  panel.style.padding = "8px";
  panel.style.backdropFilter = "blur(4px)";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";

  const title = document.createElement("div");
  title.textContent = "Quick Port";
  title.style.color = "#cdd6f4";
  title.style.fontFamily = "sans-serif";
  title.style.fontSize = "11px";
  title.style.textTransform = "uppercase";
  title.style.letterSpacing = "0.8px";
  title.style.opacity = "0.85";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "\u00D7";
  closeBtn.style.background = "none";
  closeBtn.style.border = "none";
  closeBtn.style.color = "#cdd6f4";
  closeBtn.style.fontSize = "18px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.padding = "0 4px";
  closeBtn.style.lineHeight = "1";
  closeBtn.style.touchAction = "manipulation";
  closeBtn.onclick = () => { panel.style.display = "none"; };

  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  const toggleBtn = document.createElement("button");
  toggleBtn.id = "mobile-teleport-toggle";
  toggleBtn.textContent = "\u26A1";
  toggleBtn.title = "Quick Port";
  toggleBtn.style.position = "fixed";
  toggleBtn.style.right = "62px";
  toggleBtn.style.top = "50%";
  toggleBtn.style.transform = "translateY(-50%)";
  toggleBtn.style.width = "44px";
  toggleBtn.style.height = "44px";
  toggleBtn.style.borderRadius = "50%";
  toggleBtn.style.background = "rgba(0,0,0,0.5)";
  toggleBtn.style.backdropFilter = "blur(6px)";
  toggleBtn.style.border = "1px solid rgba(255,255,255,0.2)";
  toggleBtn.style.color = "#c8d8f0";
  toggleBtn.style.fontSize = "20px";
  toggleBtn.style.display = "flex";
  toggleBtn.style.alignItems = "center";
  toggleBtn.style.justifyContent = "center";
  toggleBtn.style.cursor = "pointer";
  toggleBtn.style.zIndex = "6000";
  toggleBtn.style.touchAction = "manipulation";
  toggleBtn.onclick = () => {
    panel.style.display = panel.style.display === "flex" ? "none" : "flex";
  };

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

  document.body.appendChild(toggleBtn);
  document.body.appendChild(panel);
}
