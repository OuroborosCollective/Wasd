import { subscribePartyState, getPartyMembers, isInParty, getPartyId } from "../state/partyState";
import { sendCommand } from "../networking/websocketClient";

let panelNode: HTMLElement | null = null;
let unsub: (() => void) | null = null;

export function renderPartyPanel(): void {
  if (panelNode) return;

  panelNode = document.createElement("div");
  panelNode.id = "party-panel";
  panelNode.style.cssText = [
    "position:fixed",
    "left:12px",
    "top:116px",
    "width:180px",
    "background:rgba(10,14,28,0.82)",
    "border:1px solid rgba(242,125,38,0.35)",
    "border-radius:10px",
    "color:#e8ecf5",
    "font:12px/1.4 system-ui,sans-serif",
    "padding:8px",
    "z-index:10010",
    "backdrop-filter:blur(4px)",
    "pointer-events:auto",
  ].join(";");

  document.body.appendChild(panelNode);
  updatePartyUI();

  unsub = subscribePartyState(() => updatePartyUI());
}

function updatePartyUI(): void {
  if (!panelNode) return;

  if (!isInParty()) {
    panelNode.style.display = "none";
    return;
  }

  panelNode.style.display = "block";
  const members = getPartyMembers();

  panelNode.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;opacity:0.7;letter-spacing:0.5px">PARTY</span>
      <button id="party-leave-btn" style="
        background:rgba(255,68,68,0.2);border:1px solid rgba(255,68,68,0.4);
        color:#ff8888;font-size:10px;padding:2px 6px;border-radius:4px;cursor:pointer
      ">Leave</button>
    </div>
    ${members
      .map((m) => {
        const pct = m.maxHealth > 0 ? Math.round((m.health / m.maxHealth) * 100) : 0;
        const barColor = pct > 50 ? "#44cc66" : pct > 25 ? "#ccaa22" : "#cc4444";
        return `
      <div style="margin-bottom:5px">
        <div style="display:flex;justify-content:space-between;font-size:11px">
          <span>${m.isLeader ? "\u{2B50}" : ""}${escapeHtml(m.name)}</span>
          <span style="opacity:0.6">Lv${m.level}</span>
        </div>
        <div style="height:4px;border-radius:2px;background:rgba(255,255,255,0.1);overflow:hidden;margin-top:2px">
          <div style="height:100%;width:${pct}%;background:${barColor};border-radius:2px;transition:width 0.3s"></div>
        </div>
        <div style="font-size:9px;opacity:0.5;text-align:right">${m.health}/${m.maxHealth}</div>
      </div>`;
      })
      .join("")}
  `;

  const leaveBtn = document.getElementById("party-leave-btn");
  leaveBtn?.addEventListener("click", () => sendCommand("party_leave"));
}

function escapeHtml(str: string): string {
  const el = document.createElement("span");
  el.textContent = str;
  return el.innerHTML;
}

export function destroyPartyPanel(): void {
  if (unsub) {
    unsub();
    unsub = null;
  }
  panelNode?.remove();
  panelNode = null;
}
