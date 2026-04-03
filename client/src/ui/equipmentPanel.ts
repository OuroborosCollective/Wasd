import { closeAllPanels } from "./panelManager";
import { applyGamePanelLayout, panelCloseButtonStyles } from "./panelLayout";
import { getPlayerEquipment, subscribePlayerState } from "../state/playerState";
import { sendUnequipItem } from "../networking/websocketClient";

function slotRow(
  label: string,
  item: { name?: string; id?: string } | null,
  slot: "weapon" | "armor",
  compact: boolean
): HTMLDivElement {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.justifyContent = "space-between";
  row.style.gap = "12px";
  row.style.padding = compact ? "12px 10px" : "10px 8px";
  row.style.minHeight = compact ? "56px" : "48px";
  row.style.borderRadius = "10px";
  row.style.background = "var(--surface-container-high, rgba(255,255,255,0.06))";
  row.style.border = "1px solid var(--outline-variant, rgba(255,255,255,0.12))";
  row.style.width = "100%";
  row.style.maxWidth = "360px";

  const left = document.createElement("div");
  left.style.flex = "1";
  left.style.minWidth = "0";
  const lab = document.createElement("div");
  lab.textContent = label;
  lab.style.fontSize = "11px";
  lab.style.textTransform = "uppercase";
  lab.style.opacity = "0.7";
  lab.style.letterSpacing = "0.06em";
  const name = document.createElement("div");
  name.textContent = item ? item.name || item.id || "—" : "—";
  name.style.fontWeight = "600";
  name.style.fontSize = compact ? "16px" : "15px";
  name.style.marginTop = "4px";
  name.style.wordBreak = "break-word";
  left.appendChild(lab);
  left.appendChild(name);

  row.appendChild(left);

  if (item) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Unequip";
    btn.style.flexShrink = "0";
    btn.style.padding = "10px 16px";
    btn.style.minHeight = "44px";
    btn.style.borderRadius = "10px";
    btn.style.border = "1px solid rgba(180,180,200,0.35)";
    btn.style.background = "rgba(35,38,52,0.95)";
    btn.style.color = "#e8ecf5";
    btn.style.fontSize = "14px";
    btn.style.touchAction = "manipulation";
    btn.onclick = () => sendUnequipItem(slot);
    row.appendChild(btn);
  }

  return row;
}

function refreshEquipmentContent(wrap: HTMLElement, compact: boolean) {
  wrap.replaceChildren();
  const eq = getPlayerEquipment() as { weapon?: unknown; armor?: unknown };
  const weapon = (eq?.weapon as { name?: string; id?: string } | null) || null;
  const armor = (eq?.armor as { name?: string; id?: string } | null) || null;
  wrap.appendChild(slotRow("Weapon", weapon, "weapon", compact));
  wrap.appendChild(slotRow("Armor", armor, "armor", compact));
  const hint = document.createElement("p");
  hint.textContent = "Use Inventory to equip weapons and body armor.";
  hint.style.fontSize = "13px";
  hint.style.opacity = "0.75";
  hint.style.marginTop = "12px";
  hint.style.lineHeight = "1.45";
  wrap.appendChild(hint);
}

export function renderEquipmentPanel() {
  let panel = document.getElementById("equipment-panel");

  if (panel) {
    if (panel.style.display === "none") {
      closeAllPanels();
      panel.style.display = "flex";
      const wrap = panel.querySelector("#equipment-dynamic-content");
      const compact = panel.dataset.compact === "1";
      if (wrap) refreshEquipmentContent(wrap as HTMLElement, compact);
    } else {
      panel.style.display = "none";
    }
    return;
  }

  closeAllPanels();

  panel = document.createElement("div");
  panel.id = "equipment-panel";
  panel.className = "obsidian-relic panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Equipment Panel");

  const compact = applyGamePanelLayout(panel);
  panel.dataset.compact = compact ? "1" : "0";

  const stopEvents = (e: Event) => e.stopPropagation();
  ["touchstart", "touchmove", "mousedown", "pointerdown", "pointerup", "pointercancel", "click"].forEach((evt) => {
    panel!.addEventListener(evt, stopEvents, { passive: false });
  });

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.marginBottom = "10px";
  header.style.borderBottom = "1px solid var(--outline-variant)";
  header.style.paddingBottom = "5px";

  const title = document.createElement("h2");
  title.textContent = "Equipment";
  title.style.margin = "0";
  title.style.fontSize = "18px";
  title.className = "gold-text font-serif";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.className = "btn-gold";
  Object.assign(closeBtn.style, panelCloseButtonStyles(compact));
  closeBtn.setAttribute("aria-label", "Close Equipment Panel");
  closeBtn.onclick = () => {
    panel!.style.display = "none";
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && panel!.style.display !== "none") {
      panel!.style.display = "none";
    }
  };
  window.addEventListener("keydown", handleKeyDown);

  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  const wrap = document.createElement("div");
  wrap.id = "equipment-dynamic-content";
  wrap.style.flex = "1";
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.alignItems = "center";
  wrap.style.gap = "12px";
  wrap.style.overflowY = "auto";
  wrap.style.webkitOverflowScrolling = "touch";
  wrap.style.padding = compact ? "8px 4px" : "5px";

  refreshEquipmentContent(wrap, compact);
  panel.appendChild(wrap);

  subscribePlayerState(() => {
    if (panel && panel.style.display !== "none") {
      refreshEquipmentContent(wrap, compact);
    }
  });

  document.body.appendChild(panel);
}
