import { auth } from "../auth/firebase";
import { sendDialogueChoice, sendQuestAccept } from "../networking/websocketClient";
import { getPlayerGold, getPlayerXp, subscribePlayerState } from "../state/playerState";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

export function renderHUD() {
  const hud = document.createElement("div");
  hud.id = "arel-hud";
  const statsSpan = document.createElement("span");
  statsSpan.id = "arel-hud-stats";
  statsSpan.style.marginRight = "8px";
  const updateStats = () => {
    statsSpan.textContent = `Gold ${getPlayerGold()} · XP ${getPlayerXp()}`;
  };
  updateStats();
  subscribePlayerState(updateStats);

  hud.appendChild(statsSpan);
  const label = document.createElement("span");
  label.textContent = "Areloria";
  hud.appendChild(label);
  hud.style.position = "fixed";
  hud.style.top = "12px";
  hud.style.left = "12px";
  hud.style.padding = "8px 12px";
  hud.style.background = "rgba(0,0,0,0.55)";
  hud.style.color = "#fff";
  hud.style.fontFamily = "sans-serif";
  hud.style.borderRadius = "4px";
  hud.style.borderLeft = "3px solid #f27d26";
  document.body.appendChild(hud);

  const loginBtn = document.createElement("button");
  loginBtn.textContent = "Login with Google";
  loginBtn.style.marginLeft = "10px";
  loginBtn.style.padding = "4px 8px";
  loginBtn.style.background = "#f27d26";
  loginBtn.style.color = "#fff";
  loginBtn.style.borderRadius = "4px";
  loginBtn.style.cursor = "pointer";
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

  let dialogueBox = document.getElementById("dialogue-box");
  if (!dialogueBox) {
    dialogueBox = document.createElement("div");
    dialogueBox.id = "dialogue-box";
    dialogueBox.style.position = "fixed";
    dialogueBox.style.top = "18%";
    dialogueBox.style.left = "50%";
    dialogueBox.style.transform = "translateX(-50%)";
    dialogueBox.style.background = "rgba(0, 0, 0, 0.88)";
    dialogueBox.style.color = "white";
    dialogueBox.style.padding = "18px 20px";
    dialogueBox.style.borderRadius = "12px";
    dialogueBox.style.border = "2px solid #f27d26";
    dialogueBox.style.maxWidth = "min(520px, 92vw)";
    dialogueBox.style.width = "min(520px, 92vw)";
    dialogueBox.style.textAlign = "left";
    dialogueBox.style.zIndex = "2000";
    dialogueBox.style.fontFamily = "sans-serif";
    dialogueBox.style.boxShadow = "0 10px 25px rgba(0,0,0,0.5)";
    document.body.appendChild(dialogueBox);

    const titleEl = document.createElement("div");
    titleEl.id = "dialogue-title";
    titleEl.style.fontSize = "11px";
    titleEl.style.textTransform = "uppercase";
    titleEl.style.letterSpacing = "0.08em";
    titleEl.style.opacity = "0.75";
    titleEl.style.marginBottom = "8px";
    dialogueBox.appendChild(titleEl);

    const textEl = document.createElement("div");
    textEl.id = "dialogue-text";
    textEl.style.lineHeight = "1.45";
    textEl.style.whiteSpace = "pre-wrap";
    dialogueBox.appendChild(textEl);

    const choicesEl = document.createElement("div");
    choicesEl.id = "dialogue-choices";
    choicesEl.style.marginTop = "14px";
    choicesEl.style.display = "flex";
    choicesEl.style.flexDirection = "column";
    choicesEl.style.gap = "8px";
    dialogueBox.appendChild(choicesEl);

    const closeRow = document.createElement("div");
    closeRow.style.marginTop = "14px";
    closeRow.style.display = "flex";
    closeRow.style.justifyContent = "flex-end";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "Close";
    closeBtn.style.padding = "6px 14px";
    closeBtn.style.borderRadius = "8px";
    closeBtn.style.border = "1px solid rgba(255,255,255,0.25)";
    closeBtn.style.background = "rgba(40,40,40,0.9)";
    closeBtn.style.color = "#eee";
    closeBtn.style.cursor = "pointer";
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      dialogueBox!.style.display = "none";
    };
    closeRow.appendChild(closeBtn);
    dialogueBox.appendChild(closeRow);
  }

  const titleEl = document.getElementById("dialogue-title");
  if (titleEl) {
    titleEl.textContent = data.source ? data.source : " ";
  }

  const textEl = document.getElementById("dialogue-text");
  if (textEl) {
    textEl.textContent = body;
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
        btn.style.padding = "10px 12px";
        btn.style.borderRadius = "8px";
        btn.style.border = "1px solid rgba(242,125,38,0.45)";
        btn.style.background = "rgba(30,35,50,0.95)";
        btn.style.color = "#e8ecf5";
        btn.style.cursor = "pointer";
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

  dialogueBox.style.display = "block";
}
