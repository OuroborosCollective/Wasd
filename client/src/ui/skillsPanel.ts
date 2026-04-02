import { closeAllPanels } from "./panelManager";
import { applyGamePanelLayout, panelCloseButtonStyles } from "./panelLayout";
import { sendUseSkill } from "../networking/websocketClient";
import { ACTIVE_COMBAT_SKILLS } from "../game/combatSkills";

function skillRow(skill: (typeof ACTIVE_COMBAT_SKILLS)[0], compact: boolean): HTMLDivElement {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.justifyContent = "space-between";
  row.style.gap = "10px";
  row.style.padding = compact ? "12px 10px" : "10px 8px";
  row.style.borderRadius = "10px";
  row.style.background = "var(--surface-container-high, rgba(255,255,255,0.06))";
  row.style.border = "1px solid var(--outline-variant, rgba(255,255,255,0.12))";

  const text = document.createElement("div");
  text.style.flex = "1";
  text.style.minWidth = "0";
  const title = document.createElement("div");
  title.textContent = skill.name;
  title.style.fontWeight = "600";
  title.style.fontSize = compact ? "15px" : "14px";
  const sub = document.createElement("div");
  sub.textContent = skill.detail;
  sub.style.fontSize = "12px";
  sub.style.opacity = "0.78";
  sub.style.marginTop = "4px";
  text.appendChild(title);
  text.appendChild(sub);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Cast";
  btn.style.flexShrink = "0";
  btn.style.padding = "10px 16px";
  btn.style.minHeight = "44px";
  btn.style.borderRadius = "10px";
  btn.style.border = "1px solid rgba(180,90,255,0.45)";
  btn.style.background = "rgba(45,38,62,0.95)";
  btn.style.color = "#f0e8ff";
  btn.style.fontSize = "14px";
  btn.style.touchAction = "manipulation";
  btn.onclick = () => sendUseSkill(skill.id);

  row.appendChild(text);
  row.appendChild(btn);
  return row;
}

function refreshSkillsContent(content: HTMLElement, compact: boolean) {
  content.replaceChildren();
  const hint = document.createElement("p");
  hint.textContent =
    "Active skills use mana and share targeting with your locked enemy (tap) or nearest foe.";
  hint.style.fontSize = "13px";
  hint.style.opacity = "0.8";
  hint.style.lineHeight = "1.45";
  hint.style.margin = "0 0 10px 0";
  content.appendChild(hint);
  for (const s of ACTIVE_COMBAT_SKILLS) {
    content.appendChild(skillRow(s, compact));
  }
}

export function renderSkillsPanel() {
  let panel = document.getElementById("skills-panel");

  if (panel) {
    if (panel.style.display === "none") {
      closeAllPanels();
      panel.style.display = "flex";
      const content = panel.querySelector("#skills-dynamic-content");
      const compact = panel.dataset.compact === "1";
      if (content) refreshSkillsContent(content as HTMLElement, compact);
    } else {
      panel.style.display = "none";
    }
    return;
  }

  closeAllPanels();

  panel = document.createElement("div");
  panel.id = "skills-panel";
  panel.className = "obsidian-relic panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Skills Panel");

  const compact = applyGamePanelLayout(panel);
  panel.dataset.compact = compact ? "1" : "0";

  const stopEvents = (e: Event) => e.stopPropagation();
  ["touchstart", "touchmove", "mousedown", "pointerdown", "click"].forEach((evt) => {
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
  title.textContent = "Skills";
  title.style.margin = "0";
  title.style.fontSize = "18px";
  title.className = "gold-text font-serif";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.className = "btn-gold";
  Object.assign(closeBtn.style, panelCloseButtonStyles(compact));
  closeBtn.setAttribute("aria-label", "Close Skills Panel");
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
  content.id = "skills-dynamic-content";
  content.style.flex = "1";
  content.style.display = "flex";
  content.style.flexDirection = "column";
  content.style.gap = "8px";
  content.style.overflowY = "auto";
  content.style.webkitOverflowScrolling = "touch";
  content.style.padding = compact ? "8px 4px" : "5px";

  refreshSkillsContent(content, compact);
  panel.appendChild(content);

  document.body.appendChild(panel);
}
