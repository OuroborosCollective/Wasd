import { auth } from "../auth/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

export function renderHUD() {
  const hud = document.createElement("div");
  hud.id = "arel-hud";
  hud.textContent = "Arelorian HUD online";
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

export function showDialogue(text: string) {
  let dialogueBox = document.getElementById('dialogue-box');
  if (!dialogueBox) {
    dialogueBox = document.createElement('div');
    dialogueBox.id = 'dialogue-box';
    dialogueBox.style.position = 'fixed';
    dialogueBox.style.bottom = '120px';
    dialogueBox.style.left = '50%';
    dialogueBox.style.transform = 'translateX(-50%)';
    dialogueBox.style.background = 'rgba(0, 0, 0, 0.85)';
    dialogueBox.style.color = 'white';
    dialogueBox.style.padding = '20px';
    dialogueBox.style.borderRadius = '12px';
    dialogueBox.style.border = '2px solid #f27d26';
    dialogueBox.style.maxWidth = '80%';
    dialogueBox.style.width = '400px';
    dialogueBox.style.textAlign = 'center';
    dialogueBox.style.zIndex = '2000';
    dialogueBox.style.fontFamily = 'sans-serif';
    dialogueBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    dialogueBox.style.cursor = 'pointer';
    document.body.appendChild(dialogueBox);

    const textEl = document.createElement('div');
    textEl.id = 'dialogue-text';
    dialogueBox.appendChild(textEl);

    const closeBtn = document.createElement('div');
    closeBtn.innerText = 'Click to close';
    closeBtn.style.fontSize = '11px';
    closeBtn.style.marginTop = '15px';
    closeBtn.style.opacity = '0.6';
    closeBtn.style.textTransform = 'uppercase';
    closeBtn.style.letterSpacing = '1px';
    dialogueBox.appendChild(closeBtn);

    dialogueBox.onclick = () => {
      dialogueBox!.style.display = 'none';
    };
  }

  const textEl = document.getElementById('dialogue-text');
  if (textEl) {
    textEl.textContent = text;
  }
  
  dialogueBox.style.display = 'block';
}
