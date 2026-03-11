export function renderHUD() {
  const hud = document.createElement("div");
  hud.textContent = "Arelorian HUD online - WASD to move, E to interact";
  hud.style.position = "fixed";
  hud.style.top = "12px";
  hud.style.left = "12px";
  hud.style.padding = "8px 12px";
  hud.style.background = "rgba(0,0,0,0.55)";
  hud.style.color = "#fff";
  hud.style.fontFamily = "sans-serif";
  document.body.appendChild(hud);
}

export function showDialogue(source: string, text: string) {
  let dialogueBox = document.getElementById("dialogue-box");
  if (!dialogueBox) {
    dialogueBox = document.createElement("div");
    dialogueBox.id = "dialogue-box";
    dialogueBox.style.position = "fixed";
    dialogueBox.style.bottom = "20px";
    dialogueBox.style.left = "50%";
    dialogueBox.style.transform = "translateX(-50%)";
    dialogueBox.style.background = "rgba(0, 0, 0, 0.8)";
    dialogueBox.style.color = "#fff";
    dialogueBox.style.padding = "16px 24px";
    dialogueBox.style.borderRadius = "8px";
    dialogueBox.style.fontFamily = "sans-serif";
    dialogueBox.style.minWidth = "300px";
    dialogueBox.style.textAlign = "center";
    document.body.appendChild(dialogueBox);
  }
  
  dialogueBox.innerHTML = `<strong>${source}:</strong> ${text}`;
  
  // Auto-hide after 5 seconds
  if ((window as any).dialogueTimeout) {
    clearTimeout((window as any).dialogueTimeout);
  }
  (window as any).dialogueTimeout = setTimeout(() => {
    if (dialogueBox && dialogueBox.parentNode) {
      dialogueBox.parentNode.removeChild(dialogueBox);
    }
  }, 5000);
}