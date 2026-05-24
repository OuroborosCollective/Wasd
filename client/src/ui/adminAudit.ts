/**
 * Admin Audit UI - Asset Path Verification
 * Fetches and displays results from the server-side model path audit.
 */

let panel: HTMLDivElement | null = null;
let isFetching = false;

const AUDIT_STYLES = `
  #admin-audit-panel {
    position: fixed; top: 10vh; left: 10vw; width: 80vw; max-width: 600px;
    height: 80vh; background: rgba(0, 10, 25, 0.95); backdrop-filter: blur(10px);
    z-index: 10000; display: flex; flex-direction: column;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #c8d8f0; border: 1px solid rgba(100, 180, 255, 0.3);
    border-radius: 12px; box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }
  .audit-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; background: rgba(0, 20, 50, 0.9);
    border-bottom: 1px solid rgba(100, 180, 255, 0.2);
  }
  .audit-header h2 { margin: 0; font-size: 18px; color: #64b4ff; text-transform: uppercase; letter-spacing: 1px; }
  .audit-close {
    background: rgba(200, 50, 50, 0.2); border: 1px solid rgba(200, 50, 50, 0.4);
    color: #ff8080; padding: 4px 12px; border-radius: 4px; cursor: pointer;
  }
  .audit-close:hover { background: rgba(200, 50, 50, 0.4); }
  .audit-content { flex: 1; padding: 20px; overflow-y: auto; }
  .audit-summary {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
    margin-bottom: 20px; padding: 15px; background: rgba(255, 255, 255, 0.05);
    border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .summary-item { text-align: center; }
  .summary-val { display: block; font-size: 24px; font-weight: bold; color: #fff; }
  .summary-label { font-size: 10px; color: #8ab0d0; text-transform: uppercase; }
  .audit-controls { display: flex; gap: 10px; margin-bottom: 20px; }
  .audit-btn {
    flex: 1; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold;
    border: 1px solid rgba(100, 180, 255, 0.3); background: rgba(100, 180, 255, 0.1);
    color: #64b4ff; transition: all 0.2s;
  }
  .audit-btn:hover:not(:disabled) { background: rgba(100, 180, 255, 0.2); }
  .audit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .issue-item {
    padding: 10px; margin-bottom: 8px; border-radius: 6px;
    background: rgba(200, 50, 50, 0.05); border: 1px solid rgba(200, 50, 50, 0.2);
  }
  .issue-path { display: block; color: #ff8080; font-family: monospace; font-size: 12px; word-break: break-all; }
  .issue-source { display: block; color: #8ab0d0; font-size: 10px; margin-top: 4px; }
  .audit-ok { color: #80c880; text-align: center; padding: 40px; }
`;

export function renderAdminAudit() {
  if (panel) {
    panel.remove();
    panel = null;
    return;
  }

  // Inject styles if not already present
  if (!document.getElementById("admin-audit-styles")) {
    const styleTag = document.createElement("style");
    styleTag.id = "admin-audit-styles";
    styleTag.textContent = AUDIT_STYLES;
    document.head.appendChild(styleTag);
  }

  panel = document.createElement("div");
  panel.id = "admin-audit-panel";
  panel.innerHTML = `
    <div class="audit-header">
      <h2>🔍 Content Model Audit</h2>
      <button class="audit-close" onclick="renderAdminAudit()">CLOSE</button>
    </div>
    <div class="audit-content">
      <div class="audit-controls">
        <button id="btn-run-audit" class="audit-btn">RUN FULL AUDIT</button>
      </div>
      <div id="audit-results-area">
        <div style="text-align:center; color:#8ab0d0; padding:20px;">
          Click "RUN FULL AUDIT" to check all model paths in game-data.
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  const runBtn = document.getElementById("btn-run-audit") as HTMLButtonElement;
  runBtn.onclick = () => fetchAuditData();
}

async function fetchAuditData() {
  if (isFetching) return;
  isFetching = true;

  const resultsArea = document.getElementById("audit-results-area");
  const runBtn = document.getElementById("btn-run-audit") as HTMLButtonElement;

  if (resultsArea) resultsArea.innerHTML = '<div style="text-align:center; padding:40px;">⏳ Auditing content files...</div>';
  if (runBtn) runBtn.disabled = true;

  try {
    const response = await fetch("/api/admin/content/model-path-audit");
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    const data = await response.json();

    renderResults(data);
  } catch (err: any) {
    if (resultsArea) {
      resultsArea.innerHTML = `
        <div style="color:#ff8080; padding:20px; border:1px solid rgba(200,50,50,0.3); border-radius:8px;">
          <strong>Error:</strong> ${err.message}<br>
          <small style="opacity:0.7">Make sure you are logged in as admin.</small>
        </div>
      `;
    }
  } finally {
    isFetching = false;
    if (runBtn) runBtn.disabled = false;
  }
}

function renderResults(data: any) {
  const resultsArea = document.getElementById("audit-results-area");
  if (!resultsArea) return;

  const { ok, missing, checked, uniqueModelUrls } = data;

  let html = `
    <div class="audit-summary">
      <div class="summary-item">
        <span class="summary-val">${checked}</span>
        <span class="summary-label">Checked</span>
      </div>
      <div class="summary-item">
        <span class="summary-val">${uniqueModelUrls}</span>
        <span class="summary-label">Unique URLs</span>
      </div>
      <div class="summary-item">
        <span class="summary-val" style="color: ${ok ? '#80c880' : '#ff8080'}">${missing.length}</span>
        <span class="summary-label">Missing</span>
      </div>
    </div>
  `;

  if (ok) {
    html += '<div class="audit-ok">✅ All model paths are valid!</div>';
  } else {
    html += '<h3>Missing Assets</h3>';
    html += missing.map((m: any) => `
      <div class="issue-item">
        <span class="issue-path">${m.urlPath}</span>
        <span class="issue-source">Source: ${m.source}</span>
      </div>
    `).join('');
  }

  resultsArea.innerHTML = html;
}

// Support for manual toggle via window
(window as any).toggleAdminAudit = renderAdminAudit;
