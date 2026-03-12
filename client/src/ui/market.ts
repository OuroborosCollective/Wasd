export function renderMarketUI(player: any, ws: WebSocket) {
  let panel = document.getElementById("market-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "market-panel";
    panel.style.position = "fixed";
    panel.style.top = "50%";
    panel.style.left = "50%";
    panel.style.transform = "translate(-50%, -50%)";
    panel.style.background = "rgba(10, 15, 10, 0.95)";
    panel.style.color = "#fff";
    panel.style.padding = "25px";
    panel.style.borderRadius = "16px";
    panel.style.border = "1px solid #ffcc00";
    panel.style.zIndex = "2000";
    panel.style.minWidth = "400px";
    panel.style.boxShadow = "0 20px 60px rgba(0,0,0,0.9)";
    panel.style.backdropFilter = "blur(15px)";
    document.body.appendChild(panel);
  }

  let html = `<h2 style="margin-top:0; color: #ffcc00; border-bottom: 1px solid rgba(255,204,0,0.2); padding-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; font-size: 1.2em;">Main Market</h2>`;

  html += `<div style="margin-bottom: 15px; font-size: 0.9em; opacity: 0.8;">Your Gold: <span style="color: #ffcc00; font-weight: bold;">${player.gold}</span></div>`;

  html += `<div style="display: flex; flex-direction: column; gap: 10px;">`;

  const items = [
    { id: "iron_scrap", name: "Iron Scrap", price: 15 },
    { id: "health_potion", name: "Health Potion", price: 50 },
    { id: "wolf_pelt", name: "Wolf Pelt", price: 25 }
  ];

  items.forEach(item => {
    html += `
      <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-weight: bold;">${item.name}</div>
          <div style="font-size: 0.8em; color: #ffcc00;">${item.price} Gold</div>
        </div>
        <div style="display: flex; gap: 5px;">
          <button onclick="window.marketTrade('${item.id}', -1)" style="background: #008800; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8em;">Buy</button>
          <button onclick="window.marketTrade('${item.id}', 1)" style="background: #880000; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8em;">Sell</button>
        </div>
      </div>
    `;
  });

  html += `</div><div style="text-align: center; margin-top: 20px;"><button onclick="document.getElementById('market-panel').remove()" style="background: transparent; border: 1px solid #555; color: #aaa; padding: 8px 20px; border-radius: 6px; cursor: pointer;">Leave Market</button></div>`;

  panel.innerHTML = html;

  (window as any).marketTrade = (itemId: string, amount: number) => {
    ws.send(JSON.stringify({ type: "trade", itemId, amount }));
  };
}
