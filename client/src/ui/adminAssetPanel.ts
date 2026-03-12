import { sendCommand } from "../networking/websocketClient";

let panel: HTMLDivElement | null = null;
let models: string[] = [];
let links: any[] = [];

export function toggleAdminAssetPanel() {
  if (panel) {
    panel.remove();
    panel = null;
    return;
  }

  panel = document.createElement("div");
  panel.style.position = "absolute";
  panel.style.top = "50px";
  panel.style.left = "50px";
  panel.style.width = "400px";
  panel.style.height = "500px";
  panel.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
  panel.style.color = "white";
  panel.style.border = "1px solid #555";
  panel.style.padding = "10px";
  panel.style.overflowY = "auto";
  panel.style.zIndex = "1000";

  panel.innerHTML = `
    <h3>GLB Asset Manager</h3>
    <button id="btn-scan-glb">Scan Models</button>
    <button id="btn-refresh-links">Refresh Links</button>
    <hr/>
    <h4>Create Link</h4>
    <select id="sel-glb-path"></select><br/>
    <select id="sel-target-type">
      <option value="npc_single">Specific NPC (ID)</option>
      <option value="npc_group">NPC Group (Role)</option>
      <option value="monster_group">Monster Group (Role)</option>
      <option value="object_single">Specific Object (ID)</option>
      <option value="object_group">Object Group (Item ID)</option>
    </select><br/>
    <input type="text" id="inp-target-id" placeholder="Target ID / Role" /><br/>
    <button id="btn-link-glb">Link</button>
    <hr/>
    <h4>Current Links</h4>
    <div id="glb-links-list"></div>
  `;

  document.body.appendChild(panel);

  document.getElementById("btn-scan-glb")!.onclick = () => {
    sendCommand({ type: "admin_glb_scan" });
  };

  document.getElementById("btn-refresh-links")!.onclick = () => {
    sendCommand({ type: "admin_glb_list" });
  };

  document.getElementById("btn-link-glb")!.onclick = () => {
    const glbPath = (document.getElementById("sel-glb-path") as HTMLSelectElement).value;
    const targetType = (document.getElementById("sel-target-type") as HTMLSelectElement).value;
    const targetId = (document.getElementById("inp-target-id") as HTMLInputElement).value;
    if (glbPath && targetType && targetId) {
      sendCommand({ type: "admin_glb_link", glbPath, targetType, targetId });
    }
  };

  // Initial fetch
  sendCommand({ type: "admin_glb_scan" });
  sendCommand({ type: "admin_glb_list" });
}

export function updateAdminAssetModels(newModels: string[]) {
  models = newModels;
  if (!panel) return;
  const sel = document.getElementById("sel-glb-path") as HTMLSelectElement;
  if (sel) {
    sel.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join("");
  }
}

export function updateAdminAssetLinks(newLinks: any[]) {
  links = newLinks;
  if (!panel) return;
  const list = document.getElementById("glb-links-list");
  if (list) {
    list.innerHTML = links.map(l => `
      <div style="border-bottom: 1px solid #444; margin-bottom: 5px; padding-bottom: 5px;">
        <strong>${l.glbPath}</strong><br/>
        ${l.targetType} -> ${l.targetId}
        <button onclick="window.removeGlbLink('${l.targetType}', '${l.targetId}')">Remove</button>
      </div>
    `).join("");
  }
}

(window as any).removeGlbLink = (targetType: string, targetId: string) => {
  sendCommand({ type: "admin_glb_unlink", targetType, targetId });
};
