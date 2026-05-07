/**
 * HUD & UI Utilities
 * This file maintains backward compatibility for dialogue and other HUD calls
 * by providing the necessary exports for the legacy core.
 */

import { prefersCompactTouchUi } from "./touchUi";
import { sendQuestAccept, sendDialogueChoice } from "../networking/websocketClient";

export type DialoguePayload = {
  source?: string;
  text?: string;
  questId?: string | null;
  choices?: Array<{ id: string; text: string }>;
  npcId?: string;
  nodeId?: string;
};

export function showDialogue(payload: string | DialoguePayload) {
  const data: DialoguePayload =
    typeof payload === "string" ? { text: payload } : payload || {};
  const body = data.text ?? "";
  const compact = prefersCompactTouchUi();

  let dialogueBox = document.getElementById("dialogue-box");
  if (!dialogueBox) {
    dialogueBox = document.createElement("div");
    dialogueBox.id = "dialogue-box";
    dialogueBox.setAttribute("role", "dialog");
    dialogueBox.setAttribute("aria-modal", "true");
    dialogueBox.setAttribute("aria-labelledby", "dialogue-title");
    dialogueBox.style.position = "fixed";

    const stopEvents = (e: Event) => e.stopPropagation();
    ["touchstart", "touchmove"].forEach((evt) => {
      dialogueBox!.addEventListener(evt, stopEvents, { passive: true });
    });
    [
      "touchend",
      "touchcancel",
      "mousedown",
      "mouseup",
      "mousemove",
      "pointerdown",
      "pointerup",
      "pointermove",
      "click",
    ].forEach((evt) => {
      dialogueBox!.addEventListener(evt, stopEvents, { passive: false });
    });
    dialogueBox.style.left = "50%";
    dialogueBox.style.transform = "translateX(-50%)";
    dialogueBox.style.background = "rgba(0, 0, 0, 0.9)";
    dialogueBox.style.color = "white";
    dialogueBox.style.padding = "16px 16px 12px";
    dialogueBox.style.borderRadius = "14px";
    dialogueBox.style.border = "2px solid #d4af37";
    dialogueBox.style.maxWidth = "min(520px, 94vw)";
    dialogueBox.style.width = "min(520px, 94vw)";
    dialogueBox.style.maxHeight = "min(72vh, 520px)";
    dialogueBox.style.display = "flex";
    dialogueBox.style.flexDirection = "column";
    dialogueBox.style.textAlign = "left";
    dialogueBox.style.zIndex = "6000";
    dialogueBox.style.fontFamily = "system-ui, sans-serif";
    dialogueBox.style.boxShadow = "0 10px 28px rgba(0,0,0,0.55)";
    dialogueBox.style.boxSizing = "border-box";
    document.body.appendChild(dialogueBox);

    const titleEl = document.createElement("div");
    titleEl.id = "dialogue-title";
    titleEl.style.fontSize = "11px";
    titleEl.style.textTransform = "uppercase";
    titleEl.style.letterSpacing = "0.08em";
    titleEl.style.opacity = "0.75";
    titleEl.style.marginBottom = "6px";
    titleEl.style.flexShrink = "0";
    dialogueBox.appendChild(titleEl);

    const scrollWrap = document.createElement("div");
    scrollWrap.id = "dialogue-scroll";
    scrollWrap.style.flex = "1";
    scrollWrap.style.minHeight = "0";
    scrollWrap.style.overflowY = "auto";
    scrollWrap.style.overflowX = "hidden";
    scrollWrap.style.setProperty("-webkit-overflow-scrolling", "touch");
    scrollWrap.style.paddingRight = "4px";

    const textEl = document.createElement("div");
    textEl.id = "dialogue-text";
    textEl.style.lineHeight = "1.5";
    textEl.style.whiteSpace = "pre-wrap";
    textEl.style.fontSize = compact ? "15px" : "14px";
    textEl.style.wordBreak = "break-word";
    scrollWrap.appendChild(textEl);
    dialogueBox.appendChild(scrollWrap);

    const choicesEl = document.createElement("div");
    choicesEl.id = "dialogue-choices";
    choicesEl.style.marginTop = "12px";
    choicesEl.style.display = "flex";
    choicesEl.style.flexDirection = "column";
    choicesEl.style.gap = "10px";
    choicesEl.style.flexShrink = "0";
    dialogueBox.appendChild(choicesEl);

    const closeRow = document.createElement("div");
    closeRow.style.marginTop = "12px";
    closeRow.style.display = "flex";
    closeRow.style.justifyContent = "flex-end";
    closeRow.style.flexShrink = "0";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "Close";
    closeBtn.style.padding = "12px 20px";
    closeBtn.style.minHeight = "44px";
    closeBtn.style.borderRadius = "10px";
    closeBtn.style.border = "1px solid rgba(255,255,255,0.25)";
    closeBtn.style.background = "rgba(40,40,40,0.95)";
    closeBtn.style.color = "#eee";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.transition = "background-color 0.15s ease, box-shadow 0.15s ease";
    closeBtn.addEventListener("mouseenter", () => (closeBtn.style.background = "rgba(60,60,60,0.95)"));
    closeBtn.addEventListener("mouseleave", () => (closeBtn.style.background = "rgba(40,40,40,0.95)"));
    closeBtn.addEventListener("focus", () => (closeBtn.style.boxShadow = "0 0 0 2px rgba(255,255,255,0.4)"));
    closeBtn.addEventListener("blur", () => (closeBtn.style.boxShadow = "none"));
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      dialogueBox!.style.display = "none";
    };
    closeRow.appendChild(closeBtn);
    dialogueBox.appendChild(closeRow);

    const positionDialogue = () => {
      const isCoarse = prefersCompactTouchUi();
      if (isCoarse) {
        dialogueBox!.style.top = "auto";
        dialogueBox!.style.bottom = "max(240px, env(safe-area-inset-bottom, 0px))";
      } else {
        dialogueBox!.style.bottom = "auto";
        dialogueBox!.style.top = "max(12%, env(safe-area-inset-top, 0px))";
      }
    };
    positionDialogue();
    window.addEventListener("resize", positionDialogue);

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && dialogueBox?.style.display !== "none") {
        dialogueBox!.style.display = "none";
      }
    });
  }

  const titleEl = document.getElementById("dialogue-title");
  if (titleEl) titleEl.textContent = data.source ? data.source : " ";

  const textEl = document.getElementById("dialogue-text");
  if (textEl) textEl.textContent = body;

  const choicesEl = document.getElementById("dialogue-choices");
  if (choicesEl) {
    choicesEl.innerHTML = "";
    const choices = Array.isArray(data.choices) ? data.choices : [];
    const npcId = typeof data.npcId === "string" ? data.npcId : "";
    const nodeId = typeof data.nodeId === "string" ? data.nodeId : "root";

    for (const c of choices) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = c.text || c.id;
      btn.style.textAlign = "left";
      btn.style.padding = "14px 14px";
      btn.style.borderRadius = "10px";
      btn.style.border = "1px solid #d4af37";
      btn.style.background = "rgba(30,35,50,0.98)";
      btn.style.color = "#e8ecf5";
      btn.style.cursor = "pointer";
      btn.style.transition = "background-color 0.15s ease, border-color 0.15s ease";
      const applyHover = () => {
        btn.style.background = "rgba(45,52,75,0.98)";
        btn.style.borderColor = "#f27d26";
      };
      const applyNormal = () => {
        btn.style.background = "rgba(30,35,50,0.98)";
        btn.style.borderColor = "#d4af37";
      };
      btn.addEventListener("mouseenter", applyHover);
      btn.addEventListener("mouseleave", applyNormal);
      btn.addEventListener("focus", applyHover);
      btn.addEventListener("blur", applyNormal);
      btn.onclick = (e) => {
        e.stopPropagation();
        if (!npcId) return;
        if (c.id === "sys_quest_accept") sendQuestAccept(npcId, nodeId);
        else sendDialogueChoice(npcId, c.id, nodeId);
      };
      choicesEl.appendChild(btn);
    }
  }

  dialogueBox!.style.display = "flex";
}
