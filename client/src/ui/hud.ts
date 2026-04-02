import { auth } from "../auth/firebase";
import { sendDialogueChoice, sendQuestAccept } from "../networking/websocketClient";
import {
  getPlayerGold,
  getPlayerHealth,
  getPlayerMaxHealth,
  getPlayerLevel,
  getPlayerMana,
  getPlayerMaxMana,
  getPlayerMaxStamina,
  getPlayerStamina,
  getPlayerXp,
  subscribePlayerState,
} from "../state/playerState";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { prefersCompactTouchUi } from "./touchUi";

function makeBarRow(label: string, fillPct: number, color: string): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.gap = "6px";
  wrap.style.minWidth = "0";
  const lab = document.createElement("span");
  lab.textContent = label;
  lab.style.fontSize = "10px";
  lab.style.opacity = "0.85";
  lab.style.width = "14px";
  lab.style.flexShrink = "0";
  const track = document.createElement("div");
  track.style.flex = "1";
  track.style.height = "8px";
  track.style.borderRadius = "4px";
  track.style.background = "rgba(255,255,255,0.12)";
  track.style.overflow = "hidden";
  track.style.minWidth = "40px";
  const fill = document.createElement("div");
  fill.style.height = "100%";
  fill.style.width = `${Math.min(100, Math.max(0, fillPct))}%`;
  fill.style.background = color;
  fill.style.borderRadius = "4px";
  fill.style.transition = "width 0.2s ease";
  track.appendChild(fill);
  wrap.appendChild(lab);
  wrap.appendChild(track);
  return wrap;
}

export function renderHUD() {
  const hud = document.createElement("div");
  hud.id = "arel-hud";
  hud.style.position = "fixed";
  hud.style.top = "12px";
  hud.style.left = "12px";
  hud.style.padding = "10px 12px";
  hud.style.background = "rgba(0,0,0,0.58)";
  hud.style.color = "#fff";
  hud.style.fontFamily = "system-ui, sans-serif";
  hud.style.borderRadius = "10px";
  hud.style.borderLeft = "3px solid #f27d26";
  hud.style.zIndex = "5000";
  hud.style.maxWidth = prefersCompactTouchUi() ? "min(92vw, 280px)" : "320px";
  hud.style.boxSizing = "border-box";

  const topRow = document.createElement("div");
  topRow.style.display = "flex";
  topRow.style.flexWrap = "wrap";
  topRow.style.alignItems = "center";
  topRow.style.gap = "8px";
  topRow.style.marginBottom = "8px";

  const statsSpan = document.createElement("span");
  statsSpan.id = "arel-hud-stats";
  statsSpan.style.fontSize = "12px";
  statsSpan.style.lineHeight = "1.3";

  const barsWrap = document.createElement("div");
  barsWrap.id = "arel-hud-bars";
  barsWrap.style.display = "flex";
  barsWrap.style.flexDirection = "column";
  barsWrap.style.gap = "4px";
  barsWrap.style.width = "100%";

  const updateStats = () => {
    const hp = getPlayerHealth();
    const hpMax = Math.max(1, getPlayerMaxHealth());
    const st = getPlayerStamina();
    const stMax = Math.max(1, getPlayerMaxStamina());
    const mp = getPlayerMana();
    const mpMax = Math.max(1, getPlayerMaxMana());
    statsSpan.textContent = `Lv ${getPlayerLevel()} · Gold ${getPlayerGold()} · XP ${getPlayerXp()}`;
    barsWrap.replaceChildren(
      makeBarRow("♥", (hp / hpMax) * 100, "linear-gradient(90deg,#c42b2b,#ff6b5a)"),
      makeBarRow("⚡", (st / stMax) * 100, "linear-gradient(90deg,#2b6bc4,#6bb8ff)"),
      makeBarRow("✦", (mp / mpMax) * 100, "linear-gradient(90deg,#6b2bc4,#c896ff)")
    );
  };
  updateStats();
  subscribePlayerState(updateStats);

  topRow.appendChild(statsSpan);
  hud.appendChild(topRow);
  hud.appendChild(barsWrap);

  const label = document.createElement("span");
  label.textContent = "Areloria";
  label.style.fontSize = "11px";
  label.style.opacity = "0.65";
  label.style.display = "block";
  label.style.marginTop = "4px";
  hud.appendChild(label);

  document.body.appendChild(hud);

  const loginBtn = document.createElement("button");
  loginBtn.textContent = "Login with Google";
  loginBtn.style.marginTop = "8px";
  loginBtn.style.padding = "8px 12px";
  loginBtn.style.minHeight = "44px";
  loginBtn.style.background = "#f27d26";
  loginBtn.style.color = "#fff";
  loginBtn.style.borderRadius = "8px";
  loginBtn.style.cursor = "pointer";
  loginBtn.style.border = "none";
  loginBtn.style.touchAction = "manipulation";
  loginBtn.onclick = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();
      localStorage.setItem("token", token);
      console.log("Logged in!");
      loginBtn.style.display = "none";
    } catch (e) {
      console.error("Login failed", e);
    }
  };
  hud.appendChild(loginBtn);
}

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
    dialogueBox.style.position = "fixed";
    dialogueBox.style.left = "50%";
    dialogueBox.style.transform = "translateX(-50%)";
    dialogueBox.style.background = "rgba(0, 0, 0, 0.9)";
    dialogueBox.style.color = "white";
    dialogueBox.style.padding = "16px 16px 12px";
    dialogueBox.style.borderRadius = "14px";
    dialogueBox.style.border = "2px solid #f27d26";
    dialogueBox.style.maxWidth = "min(520px, 94vw)";
    dialogueBox.style.width = "min(520px, 94vw)";
    dialogueBox.style.maxHeight = "min(72vh, 520px)";
    dialogueBox.style.display = "flex";
    dialogueBox.style.flexDirection = "column";
    dialogueBox.style.textAlign = "left";
    dialogueBox.style.zIndex = "2000";
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
    scrollWrap.style.webkitOverflowScrolling = "touch";
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
    closeBtn.style.touchAction = "manipulation";
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
        dialogueBox!.style.bottom = "max(16px, env(safe-area-inset-bottom, 0px))";
        dialogueBox!.style.maxHeight = "min(65vh, 480px)";
      } else {
        dialogueBox!.style.bottom = "auto";
        dialogueBox!.style.top = "max(12%, env(safe-area-inset-top, 0px))";
        dialogueBox!.style.maxHeight = "min(72vh, 520px)";
      }
    };
    positionDialogue();
    window.addEventListener("resize", positionDialogue);
  }

  const titleEl = document.getElementById("dialogue-title");
  if (titleEl) {
    titleEl.textContent = data.source ? data.source : " ";
  }

  const textEl = document.getElementById("dialogue-text");
  if (textEl) {
    textEl.textContent = body;
    textEl.style.fontSize = compact ? "15px" : "14px";
  }

  const choicesEl = document.getElementById("dialogue-choices");
  if (choicesEl) {
    choicesEl.innerHTML = "";
    const choices = Array.isArray(data.choices) ? data.choices : [];
    const npcId = typeof data.npcId === "string" ? data.npcId : "";
    const nodeId = typeof data.nodeId === "string" ? data.nodeId : "root";

    if (choices.length > 0) {
      for (const c of choices) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = c.text || c.id;
        btn.style.textAlign = "left";
        btn.style.padding = "14px 14px";
        btn.style.minHeight = "48px";
        btn.style.borderRadius = "10px";
        btn.style.border = "1px solid rgba(242,125,38,0.5)";
        btn.style.background = "rgba(30,35,50,0.98)";
        btn.style.color = "#e8ecf5";
        btn.style.cursor = "pointer";
        btn.style.touchAction = "manipulation";
        btn.style.fontSize = compact ? "15px" : "14px";
        btn.onclick = (e) => {
          e.stopPropagation();
          if (!npcId) return;
          if (c.id === "sys_quest_accept") {
            sendQuestAccept(npcId, nodeId);
          } else if (c.id === "sys_quest_decline") {
            sendDialogueChoice(npcId, "sys_quest_decline", nodeId);
          } else {
            sendDialogueChoice(npcId, c.id, nodeId);
          }
        };
        choicesEl.appendChild(btn);
      }
    }
  }

  if (dialogueBox) {
    const isCoarse = prefersCompactTouchUi();
    if (isCoarse) {
      dialogueBox.style.top = "auto";
      dialogueBox.style.bottom = "max(16px, env(safe-area-inset-bottom, 0px))";
      dialogueBox.style.maxHeight = "min(65vh, 480px)";
    } else {
      dialogueBox.style.bottom = "auto";
      dialogueBox.style.top = "max(12%, env(safe-area-inset-top, 0px))";
      dialogueBox.style.maxHeight = "min(72vh, 520px)";
    }
  }

  dialogueBox!.style.display = "flex";
}
