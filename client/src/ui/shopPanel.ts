import { getAuthToken } from "./auth";
/**
 * Shop Panel – Matrix Energy & GLB Creator Pass
 * Handles PayPal checkout flow and subscription status display
 */

let shopVisible = false;
let currentPlayerId = "";
let currentPlayerName = "";

export function initShopPanel(playerId: string, playerName: string) {
  currentPlayerId = playerId;
  currentPlayerName = playerName;
  createShopUI();
  checkPaymentReturn();
}

function createShopUI() {
  const existing = document.getElementById("shop-panel");
  if (existing) existing.remove();

  const panel = document.createElement("div");
  panel.id = "shop-panel";
  panel.style.cssText = `
    display: none;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(700px, 95vw);
    max-height: 90vh;
    background: linear-gradient(135deg, #0a0a1a 0%, #0d1b2a 50%, #0a0a1a 100%);
    border: 2px solid #00d4ff;
    border-radius: 16px;
    box-shadow: 0 0 40px rgba(0,212,255,0.3), inset 0 0 60px rgba(0,0,0,0.5);
    z-index: 10000;
    overflow-y: auto;
    font-family: 'Segoe UI', sans-serif;
    color: #e0e8ff;
  `;

  panel.innerHTML = `
    <div style="padding: 24px;">
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #1a3a5c; padding-bottom:16px;">
        <div>
          <h2 style="margin:0; font-size:22px; color:#00d4ff; text-shadow:0 0 10px rgba(0,212,255,0.5);">⚡ Matrix Shop</h2>
          <p style="margin:4px 0 0; font-size:12px; color:#7a9ab5;">Power your adventure with Matrix Energy</p>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <div id="shop-balance" style="background:#0d2a3a; border:1px solid #00d4ff; border-radius:8px; padding:6px 14px; font-size:14px; color:#00d4ff;">
            ⚡ <span id="shop-energy-amount">...</span>
          </div>
          <button aria-label="Close Shop" onclick="document.getElementById('shop-panel').style.display='none'"
            style="background:none; border:1px solid #ff4444; color:#ff4444; border-radius:6px; padding:6px 12px; cursor:pointer; font-size:14px;"><span aria-hidden="true">✕</span></button>
        </div>
      </div>

      <!-- Tabs -->
      <div style="display:flex; gap:8px; margin-bottom:20px;">
        <button class="shop-tab active" data-tab="energy" onclick="switchShopTab('energy')"
          style="flex:1; padding:10px; background:#0d2a3a; border:1px solid #00d4ff; border-radius:8px; color:#00d4ff; cursor:pointer; font-size:13px;">
          ⚡ Matrix Energy
        </button>
        <button class="shop-tab" data-tab="glb" onclick="switchShopTab('glb')"
          style="flex:1; padding:10px; background:#0a1520; border:1px solid #3a5a7c; border-radius:8px; color:#7a9ab5; cursor:pointer; font-size:13px;">
          🎨 GLB Creator Pass
        </button>
        <button class="shop-tab" data-tab="marketplace" onclick="switchShopTab('marketplace')"
          style="flex:1; padding:10px; background:#0a1520; border:1px solid #3a5a7c; border-radius:8px; color:#7a9ab5; cursor:pointer; font-size:13px;">
          🏪 Marktplatz
        </button>
      </div>

      <!-- Energy Tab -->
      <div id="shop-tab-energy" class="shop-tab-content">
        <p style="font-size:13px; color:#7a9ab5; margin-bottom:16px;">
          Matrix Energy ist die In-Game-Währung von Areloria. Kaufe Energie, um Land zu beanspruchen, 
          Gebäude zu errichten und im Spieler-Marktplatz einzukaufen.
        </p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          ${renderEnergyPackage("matrix_100", "⚡", "100 Matrix Energy", "4,99 €", "", "#2a4a2a", "#44ff44")}
          ${renderEnergyPackage("matrix_500", "⚡⚡", "500 Matrix Energy", "19,99 €", "+50 Bonus", "#2a3a4a", "#00d4ff")}
          ${renderEnergyPackage("matrix_1200", "⚡⚡⚡", "1200 Matrix Energy", "39,99 €", "+200 Bonus", "#3a2a4a", "#aa44ff")}
          ${renderEnergyPackage("matrix_3000", "👑", "3000 Matrix Energy", "79,99 €", "+600 Bonus", "#4a2a2a", "#ffaa00")}
        </div>
      </div>

      <!-- GLB Creator Pass Tab -->
      <div id="shop-tab-glb" class="shop-tab-content" style="display:none;">
        <div id="glb-sub-status" style="margin-bottom:16px;"></div>
        <div style="background:linear-gradient(135deg, #1a0a3a, #0a1a3a); border:2px solid #aa44ff; border-radius:12px; padding:20px; text-align:center;">
          <div style="font-size:40px; margin-bottom:12px;">🎨</div>
          <h3 style="margin:0 0 8px; color:#aa44ff; font-size:20px;">GLB Creator Pass</h3>
          <p style="font-size:13px; color:#9a8ab5; margin-bottom:16px;">
            Lade eigene 3D-Modelle (.glb/.gltf) hoch, platziere sie auf deinem Land und verkaufe sie im Marktplatz.
          </p>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px; text-align:left;">
            ${glbFeature("✅", "Bis zu 20 eigene 3D-Modelle hochladen")}
            ${glbFeature("✅", "Modelle auf deinem Grundstück platzieren")}
            ${glbFeature("✅", "Modelle im Marktplatz verkaufen")}
            ${glbFeature("✅", "GLB & GLTF Format Support")}
            ${glbFeature("✅", "Bis zu 50 MB pro Modell")}
            ${glbFeature("✅", "30 Tage Zugang")}
          </div>
          <div style="font-size:28px; color:#aa44ff; font-weight:bold; margin-bottom:16px;">15,00 € / Monat</div>
          <button onclick="purchaseProduct('glb_subscription_1month')"
            style="background:linear-gradient(135deg, #6a1aaa, #aa44ff); border:none; color:white; padding:14px 32px; border-radius:8px; cursor:pointer; font-size:16px; font-weight:bold; width:100%; transition:all 0.2s;">
            🛒 Jetzt kaufen – Mit PayPal bezahlen
          </button>
        </div>
      </div>

      <!-- Marketplace Tab -->
      <div id="shop-tab-marketplace" class="shop-tab-content" style="display:none;">
        <div style="display:flex; gap:8px; margin-bottom:16px;">
          <input id="marketplace-search" type="text" placeholder="Modelle suchen..."
            style="flex:1; background:#0d2a3a; border:1px solid #1a4a6a; border-radius:8px; padding:8px 12px; color:#e0e8ff; font-size:13px;"
            oninput="searchMarketplace(this.value)">
          <button aria-label="Refresh Marketplace" onclick="loadMarketplace()"
            style="background:#0d2a3a; border:1px solid #00d4ff; color:#00d4ff; border-radius:8px; padding:8px 16px; cursor:pointer; font-size:13px;"><span aria-hidden="true">🔄</span></button>
        </div>
        <div id="marketplace-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:12px;">
          <div style="text-align:center; color:#7a9ab5; padding:40px; grid-column:1/-1;">Lade Marktplatz...</div>
        </div>
      </div>

      <!-- PayPal Info -->
      <div style="margin-top:20px; padding:12px; background:#0a1520; border-radius:8px; border:1px solid #1a3a5c; font-size:11px; color:#5a7a9a; text-align:center;">
        🔒 Sichere Zahlung über PayPal · Keine Kreditkarte nötig · Sofortige Gutschrift
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  // Inject global functions
  (window as any).switchShopTab = switchShopTab;
  (window as any).purchaseProduct = purchaseProduct;
  (window as any).loadMarketplace = loadMarketplace;
  (window as any).searchMarketplace = searchMarketplace;
  (window as any).buyMarketplaceItem = buyMarketplaceItem;

  loadBalance();
}

function renderEnergyPackage(id: string, icon: string, label: string, price: string, bonus: string, bg: string, color: string): string {
  return `
    <div style="background:${bg}; border:1px solid ${color}; border-radius:10px; padding:16px; text-align:center; cursor:pointer; transition:all 0.2s;"
      onclick="purchaseProduct('${id}')"
      onmouseover="this.style.transform='scale(1.03)'; this.style.boxShadow='0 0 20px ${color}44'"
      onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
      <div style="font-size:28px; margin-bottom:8px;">${icon}</div>
      <div style="font-size:14px; color:${color}; font-weight:bold; margin-bottom:4px;">${label}</div>
      ${bonus ? `<div style="font-size:11px; color:#ffaa00; margin-bottom:8px;">${bonus}</div>` : '<div style="margin-bottom:8px;"></div>'}
      <div style="font-size:18px; color:white; font-weight:bold; margin-bottom:12px;">${price}</div>
      <button style="background:${color}22; border:1px solid ${color}; color:${color}; border-radius:6px; padding:6px 16px; cursor:pointer; font-size:12px; width:100%;">
        Kaufen
      </button>
    </div>
  `;
}

function glbFeature(icon: string, text: string): string {
  return `<div style="font-size:12px; color:#c0b0e0; padding:4px 8px; background:#1a0a2a; border-radius:4px;">${icon} ${text}</div>`;
}

function switchShopTab(tab: string) {
  document.querySelectorAll(".shop-tab-content").forEach((el: any) => el.style.display = "none");
  document.querySelectorAll(".shop-tab").forEach((el: any) => {
    el.style.background = "#0a1520";
    el.style.borderColor = "#3a5a7c";
    el.style.color = "#7a9ab5";
  });

  const content = document.getElementById(`shop-tab-${tab}`);
  if (content) content.style.display = "block";

  const btn = document.querySelector(`[data-tab="${tab}"]`) as HTMLElement;
  if (btn) {
    btn.style.background = "#0d2a3a";
    btn.style.borderColor = "#00d4ff";
    btn.style.color = "#00d4ff";
  }

  if (tab === "glb") loadGLBStatus();
  if (tab === "marketplace") loadMarketplace();
}

async function loadBalance() {
  try {
    const res = await fetch("/api/player/balance", {
      headers: { "Authorization": `Bearer ${await getAuthToken()}` }
    });
    const data = await res.json();
    const el = document.getElementById("shop-energy-amount");
    if (el) el.textContent = (data.matrixEnergy || 0).toLocaleString();
  } catch {}
}

async function loadGLBStatus() {
  const statusEl = document.getElementById("glb-sub-status");
  if (!statusEl) return;

  try {
    const res = await fetch("/api/glb/subscription-status", {
      headers: { "Authorization": `Bearer ${await getAuthToken()}` }
    });
    const data = await res.json();

    if (data.active) {
      statusEl.innerHTML = `
        <div style="background:#0a2a0a; border:1px solid #44ff44; border-radius:8px; padding:12px; text-align:center; margin-bottom:12px;">
          <span style="color:#44ff44; font-size:14px;">✅ GLB Creator Pass aktiv</span>
          <br><span style="color:#7a9ab5; font-size:12px;">Noch ${data.daysLeft} Tage · Läuft ab: ${new Date(data.expires).toLocaleDateString('de-DE')}</span>
        </div>
      `;
    } else {
      statusEl.innerHTML = `
        <div style="background:#2a0a0a; border:1px solid #ff4444; border-radius:8px; padding:12px; text-align:center; margin-bottom:12px;">
          <span style="color:#ff6666; font-size:14px;">❌ Kein aktiver GLB Creator Pass</span>
          <br><span style="color:#7a9ab5; font-size:12px;">Kaufe den Pass um eigene 3D-Modelle hochzuladen</span>
        </div>
      `;
    }
  } catch {}
}

async function purchaseProduct(productId: string) {
  if (!currentPlayerId) {
    alert("Bitte erst einloggen!");
    return;
  }

  const btn = event?.target as HTMLElement;
  if (btn) {
    btn.textContent = "⏳ Verbinde mit PayPal...";
    (btn as HTMLButtonElement).disabled = true;
  }

  try {
    const res = await fetch("/api/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        playerId: currentPlayerId,
        playerName: currentPlayerName,
      }),
    });

    const data = await res.json();
    if (data.approveUrl) {
      // Open PayPal in same window
      window.location.href = data.approveUrl;
    } else {
      alert("Fehler beim Erstellen der Bestellung: " + (data.error || "Unbekannter Fehler"));
      if (btn) {
        btn.textContent = "Kaufen";
        (btn as HTMLButtonElement).disabled = false;
      }
    }
  } catch (e) {
    alert("Verbindungsfehler. Bitte versuche es erneut.");
    if (btn) {
      btn.textContent = "Kaufen";
      (btn as HTMLButtonElement).disabled = false;
    }
  }
}

async function loadMarketplace() {
  const grid = document.getElementById("marketplace-grid");
  if (!grid) return;
  grid.innerHTML = '<div style="text-align:center; color:#7a9ab5; padding:40px; grid-column:1/-1;">Lade...</div>';

  try {
    const res = await fetch("/api/glb/marketplace");
    const data = await res.json();

    if (!data.listings || data.listings.length === 0) {
      grid.innerHTML = '<div style="text-align:center; color:#7a9ab5; padding:40px; grid-column:1/-1;">Noch keine Modelle im Marktplatz</div>';
      return;
    }

    grid.innerHTML = data.listings.map((item: any) => `
      <div style="background:#0d1a2a; border:1px solid #1a3a5c; border-radius:8px; padding:12px; text-align:center;">
        <div style="font-size:32px; margin-bottom:8px;">📦</div>
        <div style="font-size:12px; color:#e0e8ff; font-weight:bold; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.name}</div>
        <div style="font-size:11px; color:#7a9ab5; margin-bottom:8px;">von ${item.seller_name}</div>
        <div style="font-size:14px; color:#00d4ff; font-weight:bold; margin-bottom:8px;">⚡ ${item.marketplace_price}</div>
        <button onclick="buyMarketplaceItem('${item.id}', '${item.name}', ${item.marketplace_price})"
          style="background:#0d2a3a; border:1px solid #00d4ff; color:#00d4ff; border-radius:6px; padding:6px 12px; cursor:pointer; font-size:11px; width:100%;">
          Kaufen
        </button>
      </div>
    `).join("");
  } catch {
    grid.innerHTML = '<div style="text-align:center; color:#ff4444; padding:40px; grid-column:1/-1;">Fehler beim Laden</div>';
  }
}

async function searchMarketplace(query: string) {
  // Simple client-side filter for now
  const grid = document.getElementById("marketplace-grid");
  if (!grid) return;
  const items = grid.querySelectorAll("div[style*='border-radius:8px']");
  items.forEach((item: any) => {
    const name = item.querySelector("div:nth-child(2)")?.textContent?.toLowerCase() || "";
    item.style.display = name.includes(query.toLowerCase()) ? "block" : "none";
  });
}

async function buyMarketplaceItem(modelId: string, name: string, price: number) {
  if (!confirm(`"${name}" für ${price} Matrix Energy kaufen?`)) return;

  try {
    const res = await fetch("/api/glb/marketplace/buy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify({ modelId }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ ${data.message}`);
      loadBalance();
      loadMarketplace();
    } else {
      alert(`❌ ${data.error}`);
    }
  } catch {
    alert("Verbindungsfehler");
  }
}

// Check if returning from PayPal payment
function checkPaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get("payment");
  const product = params.get("product");

  if (payment === "success") {
    setTimeout(() => {
      showPaymentSuccess(product || "");
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }, 1000);
  } else if (payment === "cancelled") {
    setTimeout(() => {
      showPaymentCancelled();
      window.history.replaceState({}, "", window.location.pathname);
    }, 500);
  } else if (payment === "error") {
    setTimeout(() => {
      alert("❌ Zahlung fehlgeschlagen. Bitte versuche es erneut.");
      window.history.replaceState({}, "", window.location.pathname);
    }, 500);
  }
}

function showPaymentSuccess(productId: string) {
  const toast = document.createElement("div");
  toast.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: linear-gradient(135deg, #0a2a0a, #1a4a1a);
    border: 2px solid #44ff44;
    border-radius: 12px; padding: 20px 32px;
    color: #44ff44; font-size: 16px; font-weight: bold;
    z-index: 99999; text-align: center;
    box-shadow: 0 0 30px rgba(68,255,68,0.4);
    animation: slideDown 0.3s ease;
  `;

  let msg = "✅ Zahlung erfolgreich!";
  if (productId === "glb_subscription_1month") {
    msg = "✅ GLB Creator Pass aktiviert! Du kannst jetzt 3D-Modelle hochladen.";
  } else if (productId.startsWith("matrix_")) {
    const amounts: Record<string, string> = {
      "matrix_100": "100", "matrix_500": "550", "matrix_1200": "1400", "matrix_3000": "3600"
    };
    msg = `✅ ${amounts[productId] || "?"} Matrix Energy wurde deinem Konto gutgeschrieben!`;
  }

  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 6000);
  loadBalance();
}

function showPaymentCancelled() {
  const toast = document.createElement("div");
  toast.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: #1a1a0a; border: 2px solid #ffaa00;
    border-radius: 12px; padding: 16px 24px;
    color: #ffaa00; font-size: 14px; z-index: 99999;
  `;
  toast.textContent = "⚠️ Zahlung abgebrochen.";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

export function toggleShop() {
  const panel = document.getElementById("shop-panel");
  if (!panel) return;
  shopVisible = !shopVisible;
  panel.style.display = shopVisible ? "block" : "none";
  if (shopVisible) loadBalance();
}

export function openShop(tab?: string) {
  const panel = document.getElementById("shop-panel");
  if (!panel) return;
  panel.style.display = "block";
  shopVisible = true;
  if (tab) switchShopTab(tab);
  loadBalance();
}

export function closeShop() {
  const panel = document.getElementById("shop-panel");
  if (panel) panel.style.display = "none";
  shopVisible = false;
}
