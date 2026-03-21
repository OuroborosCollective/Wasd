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
  panel.style.position = "fixed";
  panel.style.top = "10vh";
  panel.style.left = "10vw";
  panel.style.width = "80vw";
  panel.style.maxWidth = "500px";
  panel.style.height = "80vh";
  panel.style.backgroundColor = "rgba(0, 0, 0, 0.95)";
  panel.style.color = "white";
  panel.style.border = "2px solid #00ff00";
  panel.style.padding = "20px";
  panel.style.overflowY = "auto";
  panel.style.zIndex = "2000";
  panel.style.borderRadius = "15px";
  panel.style.boxShadow = "0 0 20px rgba(0, 255, 0, 0.3)";

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <h2 style="margin: 0; color: #00ff00;">Admin Asset Manager</h2>
      <button id="btn-close-admin" style="background: #ff4444; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; font-weight: bold;">X</button>
    </div>
    
    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
      <button id="btn-scan-glb" style="flex: 1; padding: 12px; background: #444; color: white; border: 1px solid #666; border-radius: 5px; cursor: pointer;">Scan Models</button>
      <button id="btn-refresh-links" style="flex: 1; padding: 12px; background: #444; color: white; border: 1px solid #666; border-radius: 5px; cursor: pointer;">Refresh Links</button>
    </div>

    <hr style="border: 0; border-top: 1px solid #444; margin: 15px 0;"/>
    
    <h3 style="color: #00ccff;">1. Place Object at Position</h3>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <select id="sel-place-glb" style="padding: 10px; background: #222; color: white; border: 1px solid #555; border-radius: 5px;"></select>
      <input type="text" id="inp-place-name" placeholder="Object Name (e.g. My House)" style="padding: 10px; background: #222; color: white; border: 1px solid #555; border-radius: 5px;" />
      <input type="number" id="inp-place-scale" placeholder="Scale (default 1)" value="1" step="0.1" style="padding: 10px; background: #222; color: white; border: 1px solid #555; border-radius: 5px;" />
      <button id="btn-place-object" style="padding: 12px; background: #008800; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Place at my current position</button>
    </div>

    <hr style="border: 0; border-top: 1px solid #444; margin: 15px 0;"/>

    <h3 style="color: #00ccff;">2. Link GLB to Type/ID</h3>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <select id="sel-glb-path" style="padding: 10px; background: #222; color: white; border: 1px solid #555; border-radius: 5px;"></select>
      <select id="sel-target-type" style="padding: 10px; background: #222; color: white; border: 1px solid #555; border-radius: 5px;">
        <option value="npc_single">Specific NPC (ID)</option>
        <option value="npc_group">NPC Group (Role)</option>
        <option value="monster_group">Monster Group (Role)</option>
        <option value="object_single">Specific Object (ID)</option>
        <option value="object_group">Object Group (Item ID)</option>
      </select>
      <input type="text" id="inp-target-id" placeholder="Target ID / Role" style="padding: 10px; background: #222; color: white; border: 1px solid #555; border-radius: 5px;" />
      <button id="btn-link-glb" style="padding: 12px; background: #444; color: white; border: 1px solid #666; border-radius: 5px; cursor: pointer;">Create Link</button>
    </div>

    <hr style="border: 0; border-top: 1px solid #444; margin: 15px 0;"/>

    <h3 style="color: #00ccff;">3. AI World Generation</h3>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <input type="text" id="inp-ai-prompt" placeholder="e.g. A small village with 3 houses and a well" style="padding: 10px; background: #222; color: white; border: 1px solid #555; border-radius: 5px;" />
      <button id="btn-ai-generate" style="padding: 12px; background: #444; color: white; border: 1px solid #666; border-radius: 5px; cursor: pointer;">Generate with AI</button>
    </div>

    <hr style="border: 0; border-top: 1px solid #444; margin: 15px 0;"/>

    <h3 style="color: #00ccff;">4. Upload GLB</h3>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <input type="file" id="inp-glb-upload" accept=".glb" style="padding: 10px; background: #222; color: white; border: 1px solid #555; border-radius: 5px;" />
      <button id="btn-glb-upload" style="padding: 12px; background: #444; color: white; border: 1px solid #666; border-radius: 5px; cursor: pointer;">Upload from Device</button>
    </div>

    <hr style="border: 0; border-top: 1px solid #444; margin: 15px 0;"/>

    <h3 style="color: #00ccff;">Current Links</h3>
    <div id="glb-links-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
  `;

  document.body.appendChild(panel);

  document.getElementById("btn-close-admin")!.onclick = () => {
    toggleAdminAssetPanel();
  };

  document.getElementById("btn-place-object")!.onclick = () => {
    const glbPath = (document.getElementById("sel-place-glb") as HTMLSelectElement).value;
    const name = (document.getElementById("inp-place-name") as HTMLInputElement).value;
    const scale = parseFloat((document.getElementById("inp-place-scale") as HTMLInputElement).value) || 1;
    if (glbPath) {
      sendCommand({ type: "admin_place_object", glbPath, name, scale });
    }
  };

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

  document.getElementById("btn-ai-generate")!.onclick = () => {
    const prompt = (document.getElementById("inp-ai-prompt") as HTMLInputElement).value;
    if (prompt) {
      sendCommand({ type: "admin_generate_world", prompt });
    }
  };

  document.getElementById("btn-glb-upload")!.onclick = () => {
    const fileInput = document.getElementById("inp-glb-upload") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as string;
        const base64Data = data.split(",")[1];
        sendCommand({ type: "admin_glb_upload", filename: file.name, data: base64Data });
        fileInput.value = "";
      };
      reader.readAsDataURL(file);
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
  const selPlace = document.getElementById("sel-place-glb") as HTMLSelectElement;
  if (selPlace) {
    selPlace.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join("");
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
