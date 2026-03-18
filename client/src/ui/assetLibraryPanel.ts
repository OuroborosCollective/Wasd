/**
 * Asset Library Panel
 * Browse and search public asset specifications
 */

let panel: HTMLDivElement | null = null;
let currentFilter = {
  assetClass: '',
  style: '',
};
let allAssets: any[] = [];

export function toggleAssetLibraryPanel() {
  if (panel) {
    panel.remove();
    panel = null;
    return;
  }

  panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.top = '50px';
  panel.style.left = '50px';
  panel.style.width = '500px';
  panel.style.maxHeight = '90vh';
  panel.style.backgroundColor = 'rgba(10, 10, 20, 0.95)';
  panel.style.color = '#e0e0e0';
  panel.style.border = '2px solid #4a9e7c';
  panel.style.borderRadius = '8px';
  panel.style.padding = '20px';
  panel.style.overflowY = 'auto';
  panel.style.zIndex = '1001';
  panel.style.fontFamily = 'monospace';
  panel.style.boxShadow = '0 0 20px rgba(74, 158, 124, 0.3)';

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <h2 style="margin: 0; color: #4a9e7c;">Asset Library</h2>
      <button id="btn-close-lib" aria-label="Close Asset Library" style="background: none; border: none; color: #e0e0e0; font-size: 20px; cursor: pointer;"><span aria-hidden="true">✕</span></button>
    </div>

    <div style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 5px; color: #a0a0a0;">Asset Class</label>
      <select id="sel-lib-class" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.05); border: 1px solid #4a9e7c; color: #e0e0e0; border-radius: 4px;">
        <option value="">All Classes</option>
        <option value="character">Character</option>
        <option value="creature">Creature</option>
        <option value="prop">Prop</option>
        <option value="weapon">Weapon</option>
        <option value="environment">Environment</option>
      </select>
    </div>

    <div style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 5px; color: #a0a0a0;">Style</label>
      <select id="sel-lib-style" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.05); border: 1px solid #4a9e7c; color: #e0e0e0; border-radius: 4px;">
        <option value="">All Styles</option>
        <option value="realistic">Realistic</option>
        <option value="stylized">Stylized</option>
        <option value="hand-painted">Hand-painted</option>
        <option value="sci-fi">Sci-Fi</option>
        <option value="fantasy">Fantasy</option>
        <option value="low-poly">Low-Poly</option>
      </select>
    </div>

    <button id="btn-search-lib" style="width: 100%; padding: 10px; background: #4a9e7c; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; margin-bottom: 15px;">
      Search Library
    </button>

    <div id="lib-results" style="display: none;">
      <h3 style="color: #4a9e7c; margin-top: 0;">Results</h3>
      <div id="lib-list" style="max-height: 400px; overflow-y: auto;"></div>
    </div>

    <div id="lib-loading" style="display: none; text-align: center; color: #4a9e7c;">
      Loading assets...
    </div>
  `;

  document.body.appendChild(panel);

  // Event listeners
  document.getElementById('btn-close-lib')!.onclick = () => toggleAssetLibraryPanel();
  document.getElementById('btn-search-lib')!.onclick = searchLibrary;

  // Load initial assets
  searchLibrary();
}

async function searchLibrary() {
  const classEl = document.getElementById('sel-lib-class') as HTMLSelectElement;
  const styleEl = document.getElementById('sel-lib-style') as HTMLSelectElement;
  const loadingEl = document.getElementById('lib-loading');
  const resultsEl = document.getElementById('lib-results');

  currentFilter.assetClass = classEl.value;
  currentFilter.style = styleEl.value;

  if (loadingEl) loadingEl.style.display = 'block';
  if (resultsEl) resultsEl.style.display = 'none';

  try {
    const params = new URLSearchParams();
    if (currentFilter.assetClass) params.append('assetClass', currentFilter.assetClass);
    if (currentFilter.style) params.append('style', currentFilter.style);

    const response = await fetch(`/api/asset-brain/library?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch library');

    const data = await response.json();
    allAssets = data.library || [];

    displayLibraryAssets();

    if (loadingEl) loadingEl.style.display = 'none';
    if (resultsEl) resultsEl.style.display = 'block';
  } catch (error) {
    if (loadingEl) loadingEl.style.display = 'none';
    const listEl = document.getElementById('lib-list');
    if (listEl) {
      listEl.innerHTML = `<p style="color: #9e4a4a;">Error: ${(error as Error).message}</p>`;
    }
  }
}

function displayLibraryAssets() {
  const listEl = document.getElementById('lib-list');
  if (!listEl) return;

  if (allAssets.length === 0) {
    listEl.innerHTML = '<p style="color: #a0a0a0;">No assets found matching your filters.</p>';
    return;
  }

  listEl.innerHTML = allAssets
    .map(
      (asset) => `
    <div style="border: 1px solid #4a9e7c; border-radius: 4px; padding: 10px; margin-bottom: 10px; background: rgba(74, 158, 124, 0.1);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="color: #4a9e7c;">${asset.assetName || asset.asset_name}</strong>
        <span style="font-size: 12px; color: #a0a0a0;">${asset.assetClass || asset.asset_class}</span>
      </div>
      <div style="font-size: 12px; color: #a0a0a0; margin-bottom: 8px;">
        Style: <strong>${asset.style}</strong><br/>
        ${asset.downloads ? `Downloads: <strong>${asset.downloads}</strong>` : ''}
        ${asset.rating ? `Rating: <strong>${asset.rating.toFixed(1)}/5</strong>` : ''}
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
        <button onclick="window.viewLibraryAsset('${asset.id}')" style="padding: 5px; background: #4a9e7c; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">View</button>
        <button onclick="window.downloadAsset('${asset.id}')" style="padding: 5px; background: #7c9e4a; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">Download</button>
      </div>
    </div>
  `
    )
    .join('');
}

// Global functions for button callbacks
(window as any).viewLibraryAsset = async (assetId: string) => {
  try {
    const response = await fetch(`/api/asset-brain/specs/${assetId}`);
    if (!response.ok) throw new Error('Asset not found');

    const data = await response.json();
    const asset = data.specification;

    const detailsWindow = window.open('', '_blank', 'width=900,height=700');
    if (!detailsWindow) return;

    detailsWindow.document.write(`
      <html>
        <head>
          <title>${asset.assetName} - Asset Details</title>
          <style>
            body { background: #1a1a2e; color: #e0e0e0; font-family: monospace; padding: 20px; }
            h1 { color: #4a9e7c; }
            h2 { color: #4a9e7c; margin-top: 20px; border-bottom: 1px solid #4a9e7c; padding-bottom: 10px; }
            pre { background: rgba(0,0,0,0.5); padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 11px; }
            .spec-section { margin-bottom: 20px; }
            .spec-key { color: #4a9e7c; font-weight: bold; }
            .spec-value { color: #a0a0a0; }
          </style>
        </head>
        <body>
          <h1>${asset.assetName}</h1>
          <div class="spec-section">
            <h2>Classification</h2>
            <p><span class="spec-key">Class:</span> <span class="spec-value">${asset.assetClass}</span></p>
            <p><span class="spec-key">Style:</span> <span class="spec-value">${asset.style}</span></p>
            <p><span class="spec-key">Usage:</span> <span class="spec-value">${asset.usage}</span></p>
          </div>
          <div class="spec-section">
            <h2>Platform Profiles</h2>
            <pre>${JSON.stringify(asset.platformProfiles, null, 2)}</pre>
          </div>
          <div class="spec-section">
            <h2>Full Specification</h2>
            <pre>${JSON.stringify(asset, null, 2)}</pre>
          </div>
        </body>
      </html>
    `);
    detailsWindow.document.close();
  } catch (error) {
    alert(`Error: ${(error as Error).message}`);
  }
};

(window as any).downloadAsset = async (assetId: string) => {
  try {
    const response = await fetch(`/api/asset-brain/specs/${assetId}/export?format=json`);
    if (!response.ok) throw new Error('Download failed');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset_${assetId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(`Download failed: ${(error as Error).message}`);
  }
};
