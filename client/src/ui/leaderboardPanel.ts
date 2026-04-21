type LeaderboardSort = "xp" | "gold" | "kills";

type LeaderboardRow = {
  player_id: string;
  display_name: string;
  character_level: number;
  xp: number;
  gold: number;
  kills: number;
  deaths: number;
  updated_at: string;
};

function escHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c] as string));
}

function removeExistingPanel(): void {
  document.getElementById("panel-leaderboard")?.remove();
}

function formatNum(value: unknown): string {
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString() : "0";
}

export async function openLeaderboard(sort: LeaderboardSort = "xp"): Promise<void> {
  let rows: LeaderboardRow[] = [];
  let errorMessage = "";
  try {
    const response = await fetch(`/api/leaderboard?sort=${encodeURIComponent(sort)}&limit=20`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = (await response.json()) as { rows?: LeaderboardRow[] };
    rows = Array.isArray(payload.rows) ? payload.rows : [];
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "unknown_error";
  }

  removeExistingPanel();
  const panel = document.createElement("div");
  panel.id = "panel-leaderboard";
  panel.style.position = "fixed";
  panel.style.top = "90px";
  panel.style.left = "50%";
  panel.style.transform = "translateX(-50%)";
  panel.style.zIndex = "7000";
  panel.style.width = "min(92vw, 640px)";
  panel.style.maxHeight = "70vh";
  panel.style.overflow = "hidden";
  panel.style.background = "rgba(8,10,16,0.92)";
  panel.style.border = "1px solid rgba(255,255,255,0.18)";
  panel.style.borderRadius = "12px";
  panel.style.boxShadow = "0 12px 30px rgba(0,0,0,0.5)";
  panel.style.color = "#e8ecf5";
  panel.style.fontFamily = "system-ui,sans-serif";
  panel.style.fontSize = "13px";

  const rowHtml = rows
    .map(
      (row, index) => `
        <tr>
          <td style="padding:6px 8px;color:#ffd38c;">${index + 1}</td>
          <td style="padding:6px 8px;">${escHtml(row.display_name)}</td>
          <td style="padding:6px 8px;text-align:right;">${formatNum(row.character_level)}</td>
          <td style="padding:6px 8px;text-align:right;">${formatNum(row.xp)}</td>
          <td style="padding:6px 8px;text-align:right;">${formatNum(row.gold)}</td>
          <td style="padding:6px 8px;text-align:right;">${formatNum(row.kills)}</td>
        </tr>
      `
    )
    .join("");

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.15);">
      <strong style="font-size:14px;">🏆 Leaderboard</strong>
      <div style="display:flex;gap:6px;">
        ${(["xp", "gold", "kills"] as const)
          .map(
            (entry) => `
              <button class="lb-sort-btn" data-sort="${entry}"
                style="padding:6px 10px;border-radius:8px;border:1px solid ${
                  entry === sort ? "rgba(242,125,38,0.85)" : "rgba(255,255,255,0.2)"
                };background:${entry === sort ? "rgba(242,125,38,0.2)" : "rgba(255,255,255,0.05)"};color:#e8ecf5;cursor:pointer;">
                ${entry.toUpperCase()}
              </button>
            `
          )
          .join("")}
      </div>
      <button id="lb-close"
        style="padding:6px 9px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.06);color:#fff;cursor:pointer;">✕</button>
    </div>
    <div style="max-height:56vh;overflow:auto;">
      ${
        errorMessage
          ? `<div style="padding:16px;color:#ff9f9f;">Failed to load leaderboard (${escHtml(errorMessage)}).</div>`
          : `
            <table style="width:100%;border-collapse:collapse;">
              <thead style="position:sticky;top:0;background:rgba(12,14,22,0.98);">
                <tr>
                  <th style="padding:8px;text-align:left;color:#9fb5df;">#</th>
                  <th style="padding:8px;text-align:left;color:#9fb5df;">Player</th>
                  <th style="padding:8px;text-align:right;color:#9fb5df;">Lvl</th>
                  <th style="padding:8px;text-align:right;color:#9fb5df;">XP</th>
                  <th style="padding:8px;text-align:right;color:#9fb5df;">Gold</th>
                  <th style="padding:8px;text-align:right;color:#9fb5df;">Kills</th>
                </tr>
              </thead>
              <tbody>
                ${rowHtml || `<tr><td colspan="6" style="padding:14px;color:#b9c0cf;">No players yet.</td></tr>`}
              </tbody>
            </table>
          `
      }
    </div>
  `;

  document.body.appendChild(panel);

  panel.querySelector<HTMLButtonElement>("#lb-close")?.addEventListener("click", () => panel.remove());
  panel.querySelectorAll<HTMLButtonElement>(".lb-sort-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const nextSort = button.dataset.sort;
      if (nextSort === "xp" || nextSort === "gold" || nextSort === "kills") {
        panel.remove();
        void openLeaderboard(nextSort);
      }
    });
  });
}
