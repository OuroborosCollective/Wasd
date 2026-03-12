export function renderQuestLog(player: any) {
  let panel = document.getElementById("quest-log-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "quest-log-panel";
    panel.style.position = "fixed";
    panel.style.left = "20px";
    panel.style.top = "50%";
    panel.style.transform = "translateY(-50%)";
    panel.style.background = "rgba(10, 15, 20, 0.95)";
    panel.style.color = "#fff";
    panel.style.padding = "25px";
    panel.style.borderRadius = "16px";
    panel.style.border = "1px solid #00ffff";
    panel.style.zIndex = "2000";
    panel.style.minWidth = "300px";
    panel.style.boxShadow = "0 20px 60px rgba(0,0,0,0.9)";
    panel.style.backdropFilter = "blur(15px)";
    document.body.appendChild(panel);
  }

  let html = `<h2 style="margin-top:0; color: #00ffff; border-bottom: 1px solid rgba(0,255,255,0.2); padding-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; font-size: 1.2em;">Quest Log</h2>`;

  const quests = player.questStatus || [];

  if (quests.length === 0) {
    html += `<div style="padding: 20px; opacity: 0.5; font-style: italic; text-align: center;">No active quests</div>`;
  } else {
    quests.forEach((q: any) => {
      html += `
        <div style="margin-bottom: 15px; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; border-left: 4px solid ${q.state === 'active' ? '#00ff00' : '#ffff00'};">
          <div style="font-weight: bold; margin-bottom: 5px;">${q.title}</div>
          <div style="font-size: 0.85em; opacity: 0.7;">Status: <span style="text-transform: capitalize;">${q.state}</span></div>
          <div style="font-size: 0.8em; margin-top: 5px; color: #aaa;">${q.description || 'No description available.'}</div>
        </div>
      `;
    });
  }

  html += `<div style="text-align: center; margin-top: 20px;"><button onclick="document.getElementById('quest-log-panel').remove()" style="background: transparent; border: 1px solid #555; color: #aaa; padding: 8px 20px; border-radius: 6px; cursor: pointer;">Close</button></div>`;

  panel.innerHTML = html;
}
