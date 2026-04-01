import { closeAllPanels } from "./panelManager";
import { getPlayerQuests, subscribePlayerState, type ClientQuestEntry } from "../state/playerState";
import { requestQuestSync } from "../networking/websocketClient";

function formatQuestLine(q: ClientQuestEntry): string {
  if (q.completed) return "Completed";
  const obj = q.objectiveType || "";
  if (obj === "talk_to") {
    return `Talk to NPC: ${q.targetNpcId || q.targetId || "?"}`;
  }
  if (obj === "combat") {
    return `Defeat: ${q.targetId || "?"}`;
  }
  if (obj === "collect" && q.requiredItemId) {
    const cur = q.progress ?? 0;
    const max = q.progressMax ?? q.requiredCount ?? 1;
    return `Collect ${q.requiredItemId}: ${cur}/${max} (turn in at quest NPC)`;
  }
  return "In progress";
}

export function renderQuestLog() {
  let panel = document.getElementById("questlog-panel");

  if (panel) {
    if (panel.style.display === "none") {
      closeAllPanels();
      panel.style.display = "flex";
      requestQuestSync();
      refreshQuestPanelContent(panel);
    } else {
      panel.style.display = "none";
    }
    return;
  }

  closeAllPanels();
  requestQuestSync();

  panel = document.createElement("div");
  panel.id = "questlog-panel";
  panel.className = "obsidian-relic panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Quest Log");

  panel.style.position = "fixed";
  panel.style.left = "50%";
  panel.style.top = "50%";
  panel.style.transform = "translate(-50%, -50%)";
  panel.style.width = "90vw";
  panel.style.maxWidth = "400px";
  panel.style.height = "80vh";
  panel.style.maxHeight = "600px";
  panel.style.zIndex = "1000";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";

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
  title.textContent = "Quest Log";
  title.style.margin = "0";
  title.style.fontSize = "18px";
  title.className = "gold-text font-serif";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "X";
  closeBtn.className = "btn-gold";
  closeBtn.style.padding = "2px 8px";
  closeBtn.style.fontSize = "12px";
  closeBtn.setAttribute("aria-label", "Close Quest Log");
  closeBtn.onclick = () => {
    panel!.style.display = "none";
  };

  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  const content = document.createElement("div");
  content.id = "questlog-content";
  content.style.flex = "1";
  content.style.display = "flex";
  content.style.flexDirection = "column";
  content.style.gap = "10px";
  content.style.overflowY = "auto";
  content.style.padding = "5px";
  panel.appendChild(content);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && panel!.style.display !== "none") {
      panel!.style.display = "none";
    }
  };
  window.addEventListener("keydown", handleKeyDown);

  document.body.appendChild(panel);
  refreshQuestPanelContent(panel);
  subscribePlayerState(() => {
    if (panel && panel.style.display !== "none") {
      refreshQuestPanelContent(panel);
    }
  });
}

function refreshQuestPanelContent(panel: HTMLElement) {
  const content = panel.querySelector("#questlog-content");
  if (!content) return;
  content.innerHTML = "";
  const quests = getPlayerQuests();

  if (quests.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "No quests yet — talk to NPCs in the village.";
    empty.style.fontSize = "13px";
    empty.style.color = "var(--on-surface-variant)";
    content.appendChild(empty);
    return;
  }

  quests.forEach((q) => {
    const item = document.createElement("div");
    item.style.padding = "10px";
    item.style.background = "var(--surface-container-high)";
    item.style.border = "1px solid var(--outline-variant)";
    item.style.borderRadius = "4px";

    const qTitle = document.createElement("div");
    qTitle.textContent = q.title || q.id;
    qTitle.style.fontWeight = "bold";
    qTitle.style.fontSize = "14px";
    qTitle.style.color = "var(--primary-gold)";
    qTitle.style.marginBottom = "4px";

    const qObj = document.createElement("div");
    qObj.textContent = formatQuestLine(q);
    qObj.style.fontSize = "12px";
    qObj.style.color = "var(--on-surface-variant)";

    item.appendChild(qTitle);
    item.appendChild(qObj);
    content.appendChild(item);
  });
}
