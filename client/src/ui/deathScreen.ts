/**
 * Full-screen death overlay with respawn countdown bar.
 * Shown when the server sends `player_died`, hidden on `player_respawned`.
 */

let overlay: HTMLElement | null = null;
let countdownInterval: ReturnType<typeof setInterval> | null = null;

export function showDeathScreen(respawnInMs: number): void {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.id = "death-overlay";
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:10100",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "background:rgba(10,0,0,0.82)",
    "backdrop-filter:blur(4px)",
    "animation:deathFadeIn 0.6s ease-out",
  ].join(";");

  overlay.innerHTML = `
    <style>
      @keyframes deathFadeIn { from { opacity:0 } to { opacity:1 } }
      @keyframes skullPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
      #death-overlay .death-content {
        text-align:center; color:#e8d4c4; font-family:system-ui,sans-serif;
      }
      #death-overlay .death-skull {
        font-size:64px; animation:skullPulse 2s infinite;
      }
      #death-overlay h2 {
        margin:12px 0 4px; font-size:22px; letter-spacing:1px; color:#ff6b6b;
      }
      #death-overlay .death-sub { font-size:14px; opacity:0.8; margin:0 0 16px; }
      #death-overlay .death-bar-wrap {
        width:220px; height:6px; border-radius:3px;
        background:rgba(255,255,255,0.15); margin:0 auto; overflow:hidden;
      }
      #death-overlay .death-bar {
        height:100%; width:0%; background:linear-gradient(90deg,#ff4444,#ff8844);
        border-radius:3px; transition:width 0.2s linear;
      }
    </style>
    <div class="death-content">
      <div class="death-skull">\u{1F480}</div>
      <h2>Du wurdest besiegt</h2>
      <p class="death-sub">Respawn in <span id="death-countdown">${Math.ceil(respawnInMs / 1000)}</span>s</p>
      <div class="death-bar-wrap">
        <div class="death-bar" id="death-bar"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const total = respawnInMs;
  const start = Date.now();
  const countEl = document.getElementById("death-countdown");
  const barEl = document.getElementById("death-bar");

  countdownInterval = setInterval(() => {
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, total - elapsed);
    if (countEl) countEl.textContent = String(Math.ceil(remaining / 1000));
    if (barEl) barEl.style.width = `${(elapsed / total) * 100}%`;
    if (remaining <= 0) clearCountdown();
  }, 200);
}

export function hideDeathScreen(): void {
  clearCountdown();
  overlay?.remove();
  overlay = null;
}

function clearCountdown(): void {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}
