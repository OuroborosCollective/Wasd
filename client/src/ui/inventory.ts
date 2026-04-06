import { closeAllPanels } from "./panelManager";
import { applyGamePanelLayout, panelCloseButtonStyles } from "./panelLayout";
import {
  getPlayerDead,
  getPlayerInventory,
  subscribePlayerState,
} from "../state/playerState";
import { sendEquipItem, sendSplitStack, sendUseItem } from "../networking/websocketClient";

function itemLabel(item: { name?: string; id?: string }): string {
  return (item.name && String(item.name)) || (item.id && String(item.id)) || "?";
}

function itemTooltip(item: {
  id?: string;
  name?: string;
  type?: string;
  slot?: string;
  description?: string;
  healAmount?: number;
  restoreMana?: number;
  damage?: number;
  attackRange?: number;
  manaCost?: number;
  stackable?: boolean;
  maxStack?: number;
}): string {
  const lines: string[] = [itemLabel(item)];
  if (item.id) lines.push(`ID: ${item.id}`);
  if (item.type) lines.push(`Type: ${item.type}${item.slot ? ` · ${item.slot}` : ""}`);
  if (typeof item.description === "string" && item.description.trim()) lines.push(item.description.trim());
  if (typeof item.healAmount === "number") lines.push(`Heals +${item.healAmount} HP`);
  if (typeof item.restoreMana === "number") lines.push(`Restores +${item.restoreMana} mana`);
  if (typeof item.damage === "number") lines.push(`Damage +${item.damage}`);
  if (typeof item.attackRange === "number") lines.push(`Range ${item.attackRange}m`);
  if (typeof item.manaCost === "number") lines.push(`Mana cost ${item.manaCost}`);
  if (item.stackable) lines.push(`Stackable (max ${item.maxStack ?? "?"})`);
  return lines.join("\n");
}

function refreshInventoryContent(content: HTMLElement, compact: boolean) {
  content.replaceChildren();
  const dead = getPlayerDead();
  const items = getPlayerInventory();
  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Your pack is empty. Pick up loot or complete quests.";
    empty.style.margin = "12px 0";
    empty.style.fontSize = compact ? "15px" : "14px";
    empty.style.color = "var(--on-surface-variant, #aaa)";
    empty.style.lineHeight = "1.45";
    content.appendChild(empty);
    return;
  }
  items.forEach((raw, rowIndex) => {
    const item = raw as { id?: string; name?: string; type?: string; slot?: string };
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.gap = "10px";
    row.style.padding = compact ? "12px 10px" : "10px 8px";
    row.style.minHeight = compact ? "52px" : "44px";
    row.style.borderRadius = "10px";
    row.style.background = "var(--surface-container-high, rgba(255,255,255,0.06))";
    row.style.border = "1px solid var(--outline-variant, rgba(255,255,255,0.12))";

    const usable =
      item.type === "consumable" || item.type === "weapon" || (item.type === "armor" && item.slot === "armor");
    if (usable && !dead) {
      row.style.borderColor = "rgba(120, 200, 255, 0.45)";
      row.style.boxShadow = "0 0 0 1px rgba(120, 200, 255, 0.12) inset";
    }
    row.title = itemTooltip(item as Parameters<typeof itemTooltip>[0]);

    const text = document.createElement("div");
    text.style.flex = "1";
    text.style.minWidth = "0";
    const qty = Math.max(1, Math.floor(Number((item as { quantity?: number }).quantity) || 1));
    const title = document.createElement("div");
    title.textContent = qty > 1 ? `${itemLabel(item)} ×${qty}` : itemLabel(item);
    title.style.fontWeight = "600";
    title.style.fontSize = compact ? "15px" : "14px";
    title.style.wordBreak = "break-word";
    const sub = document.createElement("div");
    sub.textContent = item.type ? `${item.type}${item.slot ? ` · ${item.slot}` : ""}` : "";
    sub.style.fontSize = "12px";
    sub.style.opacity = "0.75";
    sub.style.marginTop = "2px";
    text.appendChild(title);
    if (sub.textContent) text.appendChild(sub);

    row.appendChild(text);

    const btnWrap = document.createElement("div");
    btnWrap.style.display = "flex";
    btnWrap.style.flexWrap = "wrap";
    btnWrap.style.gap = "6px";
    btnWrap.style.justifyContent = "flex-end";
    btnWrap.style.flexShrink = "0";

    if (item.type === "consumable" && item.id) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Use 1";
      btn.style.padding = "10px 12px";
      btn.style.minHeight = "44px";
      btn.style.borderRadius = "10px";
      btn.style.border = "1px solid rgba(80,160,255,0.45)";
      btn.style.background = "rgba(35,42,58,0.95)";
      btn.style.color = "#e8ecf5";
      btn.style.fontSize = "13px";
      btn.style.touchAction = "manipulation";
      btn.disabled = dead;
      btn.style.opacity = dead ? "0.45" : "1";
      btn.onclick = () => sendUseItem(item.id!, 1);
      btnWrap.appendChild(btn);
      if (qty > 1) {
        const all = document.createElement("button");
        all.type = "button";
        all.textContent = `Use all (${qty})`;
        all.style.padding = "10px 12px";
        all.style.minHeight = "44px";
        all.style.borderRadius = "10px";
        all.style.border = "1px solid rgba(120,200,255,0.4)";
        all.style.background = "rgba(30,48,72,0.95)";
        all.style.color = "#e8ecf5";
        all.style.fontSize = "13px";
        all.style.touchAction = "manipulation";
        all.disabled = dead;
        all.style.opacity = dead ? "0.45" : "1";
        all.onclick = () => sendUseItem(item.id!, qty);
        btnWrap.appendChild(all);
      }
    }

    const stackableTypes = new Set(["consumable", "misc"]);
    if (item.id && stackableTypes.has(String(item.type)) && qty > 1) {
      const split = document.createElement("button");
      split.type = "button";
      split.textContent = "Split";
      split.style.padding = "10px 12px";
      split.style.minHeight = "44px";
      split.style.borderRadius = "10px";
      split.style.border = "1px solid rgba(200,200,220,0.35)";
      split.style.background = "rgba(38,40,52,0.95)";
      split.style.color = "#e8ecf5";
      split.style.fontSize = "13px";
      split.style.touchAction = "manipulation";
      split.onclick = () => {
        const half = Math.max(1, Math.floor(qty / 2));
        sendSplitStack(rowIndex, half);
      };
      btnWrap.appendChild(split);
    }

    if (btnWrap.childNodes.length > 0) {
      row.appendChild(btnWrap);
    }

    if (item.type === "weapon" || (item.type === "armor" && item.slot === "armor")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Equip";
      btn.style.flexShrink = "0";
      btn.style.padding = "10px 16px";
      btn.style.minHeight = "44px";
      btn.style.borderRadius = "10px";
      btn.style.border = "1px solid rgba(242,125,38,0.5)";
      btn.style.background = "rgba(40,45,60,0.95)";
      btn.style.color = "#e8ecf5";
      btn.style.fontSize = "14px";
      btn.style.touchAction = "manipulation";
      btn.disabled = dead;
      btn.style.opacity = dead ? "0.45" : "1";
      btn.onclick = () => {
        if (item.id) sendEquipItem(item.id);
      };
      row.appendChild(btn);
    }

    content.appendChild(row);
  });
}

export function renderInventory() {
  let panel = document.getElementById("inventory-panel");

  if (panel) {
    if (panel.style.display === "none") {
      closeAllPanels();
      panel.style.display = "flex";
      const content = panel.querySelector("#inventory-dynamic-content");
      const compact = panel.dataset.compact === "1";
      if (content) refreshInventoryContent(content as HTMLElement, compact);
    } else {
      panel.style.display = "none";
    }
    return;
  }

  closeAllPanels();

  panel = document.createElement("div");
  panel.id = "inventory-panel";
  panel.className = "obsidian-relic panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Inventory");

  const compact = applyGamePanelLayout(panel);
  panel.dataset.compact = compact ? "1" : "0";

  const stopEvents = (e: Event) => e.stopPropagation();
  ["touchstart", "touchmove"].forEach((evt) => {
    panel!.addEventListener(evt, stopEvents, { passive: true });
  });
  [
    "touchend", "touchcancel",
    "mousedown", "mouseup", "mousemove",
    "pointerdown", "pointerup", "pointermove",
    "click"
  ].forEach((evt) => {
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
  title.textContent = "Inventory";
  title.style.margin = "0";
  title.style.fontSize = "18px";
  title.className = "gold-text font-serif";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.className = "btn-gold";
  Object.assign(closeBtn.style, panelCloseButtonStyles(compact));
  closeBtn.setAttribute("aria-label", "Close Inventory");
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

  const content = document.createElement("div");
  content.id = "inventory-dynamic-content";
  content.style.flex = "1";
  content.style.display = "flex";
  content.style.flexDirection = "column";
  content.style.gap = "8px";
  content.style.overflowY = "auto";
  content.style.webkitOverflowScrolling = "touch";
  content.style.padding = compact ? "8px 4px" : "5px";

  refreshInventoryContent(content, compact);
  panel.appendChild(content);

  subscribePlayerState(() => {
    if (panel && panel.style.display !== "none") {
      refreshInventoryContent(content, compact);
    }
  });

  document.body.appendChild(panel);
}
