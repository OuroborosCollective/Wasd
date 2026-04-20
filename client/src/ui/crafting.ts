function removeExistingPanel(): void {
  document.getElementById("panel-crafting")?.remove();
}

export function renderCraftingUI(): void {
  removeExistingPanel();
  const panel = document.createElement("div");
  panel.id = "panel-crafting";
  panel.style.position = "fixed";
  panel.style.top = "90px";
  panel.style.left = "50%";
  panel.style.transform = "translateX(-50%)";
  panel.style.zIndex = "7000";
  panel.style.width = "min(92vw, 480px)";
  panel.style.maxHeight = "70vh";
  panel.style.overflow = "auto";
  panel.style.background = "rgba(8,10,16,0.92)";
  panel.style.border = "1px solid rgba(255,255,255,0.18)";
  panel.style.borderRadius = "12px";
  panel.style.boxShadow = "0 12px 30px rgba(0,0,0,0.5)";
  panel.style.color = "#e8ecf5";
  panel.style.fontFamily = "system-ui,sans-serif";
  panel.style.fontSize = "13px";

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.15);">
      <strong style="font-size:14px;">⚒️ Crafting</strong>
      <button id="craft-close"
        style="padding:6px 9px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.06);color:#fff;cursor:pointer;">✕</button>
    </div>
    <div style="padding:16px;">
      <p style="color:#b9c0cf;margin:0 0 12px;">No recipes available yet. Visit a crafting NPC to learn recipes.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;">
        <div style="padding:12px;border:1px dashed rgba(255,255,255,0.15);border-radius:8px;text-align:center;color:#6b7280;">
          <div style="font-size:24px;">🔨</div>
          <div style="margin-top:4px;font-size:11px;">Blacksmith</div>
        </div>
        <div style="padding:12px;border:1px dashed rgba(255,255,255,0.15);border-radius:8px;text-align:center;color:#6b7280;">
          <div style="font-size:24px;">🧪</div>
          <div style="margin-top:4px;font-size:11px;">Alchemy</div>
        </div>
        <div style="padding:12px;border:1px dashed rgba(255,255,255,0.15);border-radius:8px;text-align:center;color:#6b7280;">
          <div style="font-size:24px;">🪡</div>
          <div style="margin-top:4px;font-size:11px;">Tailoring</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(panel);
  panel.querySelector<HTMLButtonElement>("#craft-close")?.addEventListener("click", () => panel.remove());
}
