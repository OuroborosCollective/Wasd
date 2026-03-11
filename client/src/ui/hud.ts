export function renderHUD() {
  const hud = document.createElement("div");
  hud.id = "main-hud";
  hud.style.position = "fixed";
  hud.style.top = "12px";
  hud.style.left = "12px";
  hud.style.padding = "12px";
  hud.style.background = "rgba(0,0,0,0.7)";
  hud.style.color = "#fff";
  hud.style.fontFamily = "sans-serif";
  hud.style.borderRadius = "8px";
  hud.style.display = "flex";
  hud.style.flexDirection = "column";
  hud.style.gap = "6px";
  hud.style.minWidth = "200px";
  hud.style.border = "1px solid rgba(255,255,255,0.1)";
  
  hud.innerHTML = `
    <div style="font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px; margin-bottom: 4px; color: #00ff00;">Areloria Alpha</div>
    <div id="hud-stats" style="font-size: 0.9em;">
      Gold: 0 | XP: 0
    </div>
    <div id="hud-inventory" style="font-size: 0.8em; color: #ffcc00;">
      Inv: Empty
    </div>
    <div id="hud-equipment" style="font-size: 0.8em; color: #00ccff;">
      Equip: None
    </div>
    <div id="hud-quests" style="font-size: 0.85em; color: #aaa; font-style: italic;">
      Active Quest: None
    </div>
    <div style="font-size: 0.75em; margin-top: 6px; opacity: 0.6; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;">
      WASD: Move | E: Interact | F: Attack | G: Equip First | H: Unequip
    </div>
  `;
  
  document.body.appendChild(hud);
}

export function updateHUD(data: { gold: number, xp: number, quests: any[], inventory: any[], equipment?: any }) {
  const stats = document.getElementById("hud-stats");
  if (stats) {
    stats.textContent = `Gold: ${data.gold} | XP: ${data.xp}`;
  }

  const inv = document.getElementById("hud-inventory");
  if (inv) {
    const items = data.inventory.map(i => i.name).join(", ");
    inv.textContent = items ? `Inv: ${items}` : "Inv: Empty";
  }

  const equip = document.getElementById("hud-equipment");
  if (equip && data.equipment) {
    const weapon = data.equipment.weapon ? data.equipment.weapon.name : "None";
    equip.textContent = `Weapon: ${weapon}`;
  }
  
  const quests = document.getElementById("hud-quests");
  if (quests) {
    const activeQuest = data.quests.find(q => !q.completed);
    quests.textContent = activeQuest ? `Active Quest: ${activeQuest.name}` : "Active Quest: None";
  }
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