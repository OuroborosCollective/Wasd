export function renderSkillsPanel(player: any) {
  let panel = document.getElementById("skills-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "skills-panel";
    panel.style.position = "fixed";
    panel.style.right = "20px";
    panel.style.top = "50%";
    panel.style.transform = "translateY(-50%)";
    panel.style.background = "rgba(15, 20, 15, 0.95)";
    panel.style.color = "#fff";
    panel.style.padding = "25px";
    panel.style.borderRadius = "16px";
    panel.style.border = "1px solid #00ff00";
    panel.style.zIndex = "2000";
    panel.style.minWidth = "300px";
    panel.style.boxShadow = "0 20px 60px rgba(0,0,0,0.9)";
    panel.style.backdropFilter = "blur(15px)";
    document.body.appendChild(panel);
  }

  let html = `<h2 style="margin-top:0; color: #00ff00; border-bottom: 1px solid rgba(0,255,0,0.2); padding-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; font-size: 1.2em;">Skills</h2>`;

  html += `<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">`;

  const skills = player.skills || {};
  const skillNames = ["combat", "strength", "dexterity", "magic", "crafting", "harvesting"];

  skillNames.forEach(name => {
    const s = skills[name] || { level: 1, xp: 0 };
    const nextXp = Math.floor(50 * Math.pow(s.level, 1.4));
    const progress = (s.xp / nextXp) * 100;

    html += `
      <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="text-transform: capitalize; font-weight: bold;">${name}</span>
          <span style="color: #00ff00;">Lvl ${s.level}</span>
        </div>
        <div style="width: 100%; height: 6px; background: #333; border-radius: 3px; overflow: hidden;">
          <div style="width: ${progress}%; height: 100%; background: #00ff00;"></div>
        </div>
        <div style="font-size: 0.7em; opacity: 0.5; margin-top: 4px; text-align: right;">${s.xp} / ${nextXp} XP</div>
      </div>
    `;
  });

  html += `</div><div style="text-align: center; margin-top: 20px;"><button onclick="document.getElementById('skills-panel').remove()" style="background: transparent; border: 1px solid #555; color: #aaa; padding: 8px 20px; border-radius: 6px; cursor: pointer;">Close</button></div>`;

  panel.innerHTML = html;
}
