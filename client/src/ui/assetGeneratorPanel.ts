/**
 * Asset Brain Generator Panel
 * Allows users to generate 3D asset specifications from text input
 */

let panel: HTMLDivElement | null = null;
let isGenerating = false;

interface GeneratedAsset {
  id: string;
  assetName: string;
  assetClass: string;
  style: string;
  specification: any;
  variants: any[];
}

let generatedAssets: GeneratedAsset[] = [];

export function toggleAssetGeneratorPanel() {
  if (panel) {
    panel.remove();
    panel = null;
    return;
  }

  panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.top = '50px';
  panel.style.right = '50px';
  panel.style.width = '500px';
  panel.style.maxHeight = '90vh';
  panel.style.backgroundColor = 'rgba(10, 10, 20, 0.95)';
  panel.style.color = '#e0e0e0';
  panel.style.border = '2px solid #4a7c9e';
  panel.style.borderRadius = '8px';
  panel.style.padding = '20px';
  panel.style.overflowY = 'auto';
  panel.style.zIndex = '1001';
  panel.style.fontFamily = 'monospace';
  panel.style.boxShadow = '0 0 20px rgba(74, 124, 158, 0.3)';

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <h2 style="margin: 0; color: #4a7c9e;">Asset Brain Generator</h2>
      <button id="btn-close-asset-gen" style="background: none; border: none; color: #e0e0e0; font-size: 20px; cursor: pointer;">✕</button>
    </div>
    
    <div style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 5px; color: #a0a0a0;">Asset Description</label>
      <textarea id="inp-asset-input" placeholder="e.g., 'knight with sword and shield'" 
        style="width: 100%; height: 60px; padding: 8px; background: rgba(255,255,255,0.05); border: 1px solid #4a7c9e; color: #e0e0e0; border-radius: 4px; font-family: monospace;"></textarea>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
      <div>
        <label style="display: block; margin-bottom: 5px; color: #a0a0a0;">Asset Name (optional)</label>
        <input type="text" id="inp-asset-name" placeholder="Custom name" 
          style="width: 100%; padding: 8px; background: rgba(255,255,255,0.05); border: 1px solid #4a7c9e; color: #e0e0e0; border-radius: 4px;"/>
      </div>
      <div>
        <label style="display: block; margin-bottom: 5px; color: #a0a0a0;">Style (optional)</label>
        <select id="sel-asset-style" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.05); border: 1px solid #4a7c9e; color: #e0e0e0; border-radius: 4px;">
          <option value="">Auto-detect</option>
          <option value="realistic">Realistic</option>
          <option value="stylized">Stylized</option>
          <option value="hand-painted">Hand-painted</option>
          <option value="sci-fi">Sci-Fi</option>
          <option value="fantasy">Fantasy</option>
          <option value="low-poly">Low-Poly</option>
        </select>
      </div>
    </div>

    <div style="margin-bottom: 15px;">
      <label style="display: flex; align-items: center; gap: 8px; color: #a0a0a0; cursor: pointer;">
        <input type="checkbox" id="chk-asset-public" />
        Make asset public
      </label>
    </div>

    <button id="btn-generate-asset" style="width: 100%; padding: 10px; background: #4a7c9e; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; margin-bottom: 15px;">
      Generate Asset
    </button>

    <div id="asset-status" style="display: none; padding: 10px; background: rgba(74, 124, 158, 0.2); border-radius: 4px; margin-bottom: 15px; color: #4a7c9e;"></div>

    <div id="asset-results" style="display: none;">
      <h3 style="color: #4a7c9e; margin-top: 0;">Generated Assets</h3>
      <div id="asset-list" style="max-height: 300px; overflow-y: auto;"></div>
    </div>
  `;

  document.body.appendChild(panel);

  // Event listeners
  document.getElementById('btn-close-asset-gen')!.onclick = () => toggleAssetGeneratorPanel();
  document.getElementById('btn-generate-asset')!.onclick = generateAsset;
}

async function generateAsset() {
  const input = (document.getElementById('inp-asset-input') as HTMLTextAreaElement).value.trim();
  const name = (document.getElementById('inp-asset-name') as HTMLInputElement).value.trim();
  const style = (document.getElementById('sel-asset-style') as HTMLSelectElement).value;
  const isPublic = (document.getElementById('chk-asset-public') as HTMLInputElement).checked;

  if (!input) {
    showStatus('Please enter an asset description', 'error');
    return;
  }

  if (isGenerating) return;
  isGenerating = true;

  const btn = document.getElementById('btn-generate-asset') as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = 'Generating...';

  showStatus('Generating asset specification...', 'info');

  try {
    const response = await fetch('/api/asset-brain/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
      },
      body: JSON.stringify({
        assetInput: input,
        name: name || undefined,
        style: style || undefined,
        isPublic,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate asset');
    }

    const data = await response.json();
    generatedAssets.push(data.specification);

    showStatus(`✓ Asset generated: ${data.specification.assetName}`, 'success');
    displayAssets();

    // Clear inputs
    (document.getElementById('inp-asset-input') as HTMLTextAreaElement).value = '';
    (document.getElementById('inp-asset-name') as HTMLInputElement).value = '';
  } catch (error) {
    showStatus(`Error: ${(error as Error).message}`, 'error');
  } finally {
    isGenerating = false;
    btn.disabled = false;
    btn.textContent = 'Generate Asset';
  }
}

function showStatus(message: string, type: 'info' | 'success' | 'error') {
  const statusEl = document.getElementById('asset-status');
  if (!statusEl) return;

  const colors: Record<string, string> = {
    info: '#4a7c9e',
    success: '#4a9e7c',
    error: '#9e4a4a',
  };

  statusEl.style.display = 'block';
  statusEl.style.borderColor = colors[type];
  statusEl.style.color = colors[type];
  statusEl.textContent = message;
}

function displayAssets() {
  const resultsEl = document.getElementById('asset-results');
  const listEl = document.getElementById('asset-list');

  if (!resultsEl || !listEl) return;

  resultsEl.style.display = 'block';

  listEl.innerHTML = generatedAssets
    .map(
      (asset, idx) => `
    <div style="border: 1px solid #4a7c9e; border-radius: 4px; padding: 10px; margin-bottom: 10px; background: rgba(74, 124, 158, 0.1);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="color: #4a7c9e;">${asset.assetName}</strong>
        <span style="font-size: 12px; color: #a0a0a0;">${asset.assetClass}</span>
      </div>
      <div style="font-size: 12px; color: #a0a0a0; margin-bottom: 8px;">
        Style: <strong>${asset.style}</strong><br/>
        Variants: <strong>${asset.variants?.length || 0}</strong>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
        <button onclick="window.viewAssetDetails('${asset.id}')" style="padding: 5px; background: #4a7c9e; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">View Details</button>
        <button onclick="window.exportAsset('${asset.id}')" style="padding: 5px; background: #7c4a9e; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">Export</button>
      </div>
    </div>
  `
    )
    .join('');
}

// Global functions for button callbacks
(window as any).viewAssetDetails = (assetId: string) => {
  const asset = generatedAssets.find((a) => a.id === assetId);
  if (!asset) return;

  const detailsWindow = window.open('', '_blank', 'width=800,height=600');
  if (!detailsWindow) return;

  detailsWindow.document.write(`
    <html>
      <head>
        <title>${asset.assetName} - Asset Details</title>
        <style>
          body { background: #1a1a2e; color: #e0e0e0; font-family: monospace; padding: 20px; }
          h1 { color: #4a7c9e; }
          pre { background: rgba(0,0,0,0.5); padding: 10px; border-radius: 4px; overflow-x: auto; }
          .section { margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>${asset.assetName}</h1>
        <div class="section">
          <h2>Classification</h2>
          <p><strong>Class:</strong> ${asset.assetClass}</p>
          <p><strong>Style:</strong> ${asset.style}</p>
        </div>
        <div class="section">
          <h2>Full Specification (JSON)</h2>
          <pre>${JSON.stringify(asset.specification, null, 2)}</pre>
        </div>
      </body>
    </html>
  `);
  detailsWindow.document.close();
};

(window as any).exportAsset = async (assetId: string) => {
  const asset = generatedAssets.find((a) => a.id === assetId);
  if (!asset) return;

  try {
    const response = await fetch(`/api/asset-brain/specs/${assetId}/export?format=json`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
      },
    });

    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${asset.assetName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(`Export failed: ${(error as Error).message}`);
  }
};
