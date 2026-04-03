import { auth, isFirebaseClientConfigured } from "../auth/firebase";
import { getQuickCastSkillId } from "../game/combatSkills";
import { sendDialogueChoice, sendQuestAccept, updateAuthToken } from "../networking/websocketClient";
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
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { prefersCompactTouchUi } from "./touchUi";

const GUEST_STORAGE_KEY = "areloria_guest_id";

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

  const authBox = document.createElement("div");
  authBox.id = "arel-hud-auth";
  authBox.style.marginTop = "10px";
  authBox.style.display = "flex";
  authBox.style.flexDirection = "column";
  authBox.style.gap = "8px";
  authBox.style.maxWidth = "100%";

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.flexWrap = "wrap";
  btnRow.style.gap = "8px";
  btnRow.style.alignItems = "center";

  const loginBtn = document.createElement("button");
  loginBtn.textContent = "Google";
  loginBtn.style.padding = "8px 12px";
  loginBtn.style.minHeight = "44px";
  loginBtn.style.background = "#f27d26";
  loginBtn.style.color = "#fff";
  loginBtn.style.borderRadius = "8px";
  loginBtn.style.cursor = "pointer";
  loginBtn.style.border = "none";
  loginBtn.style.touchAction = "manipulation";

  const verifyEmailBtn = document.createElement("button");
  verifyEmailBtn.type = "button";
  verifyEmailBtn.textContent = "Verify email";
  verifyEmailBtn.title = "Send a verification link to your address";
  verifyEmailBtn.style.padding = "8px 12px";
  verifyEmailBtn.style.minHeight = "44px";
  verifyEmailBtn.style.background = "rgba(50,80,120,0.95)";
  verifyEmailBtn.style.color = "#e8ecf5";
  verifyEmailBtn.style.borderRadius = "8px";
  verifyEmailBtn.style.cursor = "pointer";
  verifyEmailBtn.style.border = "1px solid rgba(120,180,255,0.4)";
  verifyEmailBtn.style.touchAction = "manipulation";

  const resetPassBtn = document.createElement("button");
  resetPassBtn.type = "button";
  resetPassBtn.textContent = "Reset password";
  resetPassBtn.title = "Email a password reset link";
  resetPassBtn.style.padding = "8px 12px";
  resetPassBtn.style.minHeight = "44px";
  resetPassBtn.style.background = "rgba(70,55,40,0.95)";
  resetPassBtn.style.color = "#e8ecf5";
  resetPassBtn.style.borderRadius = "8px";
  resetPassBtn.style.cursor = "pointer";
  resetPassBtn.style.border = "1px solid rgba(255,180,100,0.35)";
  resetPassBtn.style.touchAction = "manipulation";

  const logoutBtn = document.createElement("button");
  logoutBtn.textContent = "Sign out";
  logoutBtn.style.padding = "8px 12px";
  logoutBtn.style.minHeight = "44px";
  logoutBtn.style.background = "rgba(60,60,70,0.95)";
  logoutBtn.style.color = "#e8ecf5";
  logoutBtn.style.borderRadius = "8px";
  logoutBtn.style.cursor = "pointer";
  logoutBtn.style.border = "1px solid rgba(255,255,255,0.2)";
  logoutBtn.style.touchAction = "manipulation";

  const emailRow = document.createElement("div");
  emailRow.style.display = "flex";
  emailRow.style.flexDirection = "column";
  emailRow.style.gap = "6px";
  const emailIn = document.createElement("input");
  emailIn.type = "email";
  emailIn.placeholder = "Email";
  emailIn.autocomplete = "username";
  emailIn.style.padding = "8px 10px";
  emailIn.style.borderRadius = "8px";
  emailIn.style.border = "1px solid rgba(255,255,255,0.25)";
  emailIn.style.background = "rgba(20,22,32,0.9)";
  emailIn.style.color = "#fff";
  emailIn.style.fontSize = "14px";
  const passIn = document.createElement("input");
  passIn.type = "password";
  passIn.placeholder = "Password";
  passIn.autocomplete = "current-password";
  passIn.style.padding = "8px 10px";
  passIn.style.borderRadius = "8px";
  passIn.style.border = "1px solid rgba(255,255,255,0.25)";
  passIn.style.background = "rgba(20,22,32,0.9)";
  passIn.style.color = "#fff";
  passIn.style.fontSize = "14px";
  const emailErr = document.createElement("div");
  emailErr.style.fontSize = "11px";
  emailErr.style.color = "#ff8a8a";
  emailErr.style.minHeight = "14px";
  const emailBtnRow = document.createElement("div");
  emailBtnRow.style.display = "flex";
  emailBtnRow.style.flexWrap = "wrap";
  emailBtnRow.style.gap = "8px";
  const emailLoginBtn = document.createElement("button");
  emailLoginBtn.type = "button";
  emailLoginBtn.textContent = "Email sign in";
  emailLoginBtn.style.padding = "8px 12px";
  emailLoginBtn.style.minHeight = "44px";
  emailLoginBtn.style.borderRadius = "8px";
  emailLoginBtn.style.border = "1px solid rgba(100,180,255,0.45)";
  emailLoginBtn.style.background = "rgba(35,50,80,0.95)";
  emailLoginBtn.style.color = "#e8ecf5";
  emailLoginBtn.style.cursor = "pointer";
  emailLoginBtn.style.touchAction = "manipulation";
  const emailSignupBtn = document.createElement("button");
  emailSignupBtn.type = "button";
  emailSignupBtn.textContent = "Create account";
  emailSignupBtn.style.padding = "8px 12px";
  emailSignupBtn.style.minHeight = "44px";
  emailSignupBtn.style.borderRadius = "8px";
  emailSignupBtn.style.border = "1px solid rgba(180,255,180,0.35)";
  emailSignupBtn.style.background = "rgba(30,55,40,0.95)";
  emailSignupBtn.style.color = "#e8ecf5";
  emailSignupBtn.style.cursor = "pointer";
  emailSignupBtn.style.touchAction = "manipulation";
  emailBtnRow.appendChild(emailLoginBtn);
  emailBtnRow.appendChild(emailSignupBtn);
  emailRow.appendChild(emailIn);
  emailRow.appendChild(passIn);
  emailRow.appendChild(emailErr);
  emailRow.appendChild(emailBtnRow);

  btnRow.appendChild(loginBtn);
  btnRow.appendChild(verifyEmailBtn);
  btnRow.appendChild(resetPassBtn);
  btnRow.appendChild(logoutBtn);
  authBox.appendChild(btnRow);
  authBox.appendChild(emailRow);

  const hint = document.createElement("div");
  const refreshHint = () => {
    hint.textContent = `Quick cast (Q / SPELL): ${getQuickCastSkillId()} — change in Skills panel`;
  };
  refreshHint();
  hint.style.fontSize = "10px";
  hint.style.opacity = "0.7";
  hint.style.marginTop = "2px";
  window.addEventListener("areloria-quick-cast-changed", refreshHint);
  authBox.appendChild(hint);

  const syncAuthUi = () => {
    const u = auth?.currentUser;
    const out = !u;
    loginBtn.style.display = out ? "inline-block" : "none";
    logoutBtn.style.display = u ? "inline-block" : "none";
    verifyEmailBtn.style.display = u ? "inline-block" : "none";
    resetPassBtn.style.display = u ? "inline-block" : "none";
    emailRow.style.display = out ? "flex" : "none";
  };
  syncAuthUi();
  auth?.onAuthStateChanged(() => syncAuthUi());

  if (!isFirebaseClientConfigured() || !auth) {
    loginBtn.textContent = "Auth (configure Firebase)";
    loginBtn.disabled = true;
    loginBtn.style.opacity = "0.65";
    logoutBtn.style.display = "none";
    verifyEmailBtn.style.display = "none";
    resetPassBtn.style.display = "none";
    emailRow.style.display = "none";
  } else {
    loginBtn.onclick = async () => {
      const provider = new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(auth, provider);
        const token = await result.user.getIdToken(true);
        updateAuthToken(token);
        console.log("Logged in!");
      } catch (e) {
        console.error("Login failed", e);
      }
    };
    emailLoginBtn.onclick = async () => {
      emailErr.textContent = "";
      try {
        const cred = await signInWithEmailAndPassword(auth, emailIn.value.trim(), passIn.value);
        const token = await cred.user.getIdToken(true);
        updateAuthToken(token);
      } catch (e: unknown) {
        emailErr.textContent = e instanceof Error ? e.message : "Sign-in failed";
      }
    };
    emailSignupBtn.onclick = async () => {
      emailErr.textContent = "";
      try {
        const cred = await createUserWithEmailAndPassword(auth, emailIn.value.trim(), passIn.value);
        const token = await cred.user.getIdToken(true);
        updateAuthToken(token);
      } catch (e: unknown) {
        emailErr.textContent = e instanceof Error ? e.message : "Sign-up failed";
      }
    };
    verifyEmailBtn.onclick = async () => {
      emailErr.textContent = "";
      const u = auth.currentUser;
      if (!u?.email) {
        emailErr.textContent = "No email on this account.";
        return;
      }
      try {
        await sendEmailVerification(u);
        emailErr.textContent = "Verification email sent.";
        emailErr.style.color = "#8fdf9a";
      } catch (e: unknown) {
        emailErr.textContent = e instanceof Error ? e.message : "Could not send verification";
        emailErr.style.color = "#ff8a8a";
      }
    };
    resetPassBtn.onclick = async () => {
      emailErr.textContent = "";
      const addr = emailIn.value.trim() || auth.currentUser?.email;
      if (!addr) {
        emailErr.textContent = "Enter your email above or sign in first.";
        return;
      }
      try {
        await sendPasswordResetEmail(auth, addr);
        emailErr.textContent = "Password reset email sent.";
        emailErr.style.color = "#8fdf9a";
      } catch (e: unknown) {
        emailErr.textContent = e instanceof Error ? e.message : "Reset failed";
        emailErr.style.color = "#ff8a8a";
      }
    };
    logoutBtn.onclick = async () => {
      try {
        const { signOut } = await import("firebase/auth");
        await signOut(auth);
        updateAuthToken(null);
        localStorage.removeItem(GUEST_STORAGE_KEY);
      } catch (e) {
        console.error("Sign out failed", e);
      }
    };
  }

  hud.appendChild(authBox);
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
