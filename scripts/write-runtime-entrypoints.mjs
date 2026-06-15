#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve(process.cwd());
const distRoot = join(repoRoot, 'client/dist');
const portalRoot = join(distRoot, 'portal');
const adminDashboardRoot = join(distRoot, 'admin-dashboard');
const publicRoot = join(repoRoot, 'client/public');
const authoredLanding = join(repoRoot, 'client/landing/index.html');
const buildSha = process.env.GITHUB_SHA || process.env.BUILD_COMMIT_SHA || 'local';
const builtAt = new Date().toISOString();

mkdirSync(distRoot, { recursive: true });
mkdirSync(portalRoot, { recursive: true });
mkdirSync(adminDashboardRoot, { recursive: true });

function page(title, body) {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta name="theme-color" content="#050816" />
  <meta http-equiv="Cache-Control" content="no-store" />
  <title>${title}</title>
  <style>
    :root{color-scheme:dark;--bg:#050816;--panel:rgba(8,15,34,.78);--line:rgba(142,206,255,.24);--cyan:#48e9ff;--gold:#f6b64a;--green:#70ff9e;--text:#eff8ff;--muted:#9fb2c7;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:radial-gradient(circle at 18% 16%,rgba(72,233,255,.24),transparent 28rem),radial-gradient(circle at 78% 20%,rgba(246,182,74,.18),transparent 30rem),radial-gradient(circle at 55% 88%,rgba(112,255,158,.14),transparent 34rem),linear-gradient(180deg,#050816,#070a12 72%,#020409);color:var(--text)}body{min-height:100vh}.wrap{min-height:100vh;display:grid;place-items:center;padding:28px}.shell{width:min(1180px,100%);border:1px solid var(--line);border-radius:34px;background:linear-gradient(180deg,rgba(8,15,34,.88),rgba(4,8,18,.82));box-shadow:0 24px 90px rgba(0,0,0,.42),inset 0 0 60px rgba(72,233,255,.05);overflow:hidden}.top{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:22px 26px;border-bottom:1px solid var(--line);font:12px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.brand{display:flex;align-items:center;gap:12px;color:var(--cyan);font-weight:900}.orb{width:18px;height:18px;border-radius:50%;background:var(--cyan);box-shadow:0 0 18px var(--cyan)}main{padding:52px 28px 34px;text-align:center}.kicker{font:13px ui-monospace,monospace;letter-spacing:.22em;text-transform:uppercase;color:var(--gold)}h1{margin:16px auto 18px;max-width:920px;font-size:clamp(42px,8vw,94px);line-height:.92;letter-spacing:-.075em;text-transform:uppercase}.cyan{color:var(--cyan);text-shadow:0 0 22px rgba(72,233,255,.65)}.gold{color:var(--gold);text-shadow:0 0 22px rgba(246,182,74,.5)}.lead{max-width:760px;margin:0 auto 42px;color:var(--muted);font-size:17px;line-height:1.65}.routes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin:0 auto;max-width:980px}.card{min-height:210px;border:1px solid var(--line);border-radius:28px;background:rgba(255,255,255,.035);display:grid;align-content:center;gap:12px;padding:24px;text-decoration:none;color:var(--text);transition:.18s ease;position:relative;overflow:hidden}.card:before{content:"";position:absolute;inset:auto -20% -45% -20%;height:120px;background:radial-gradient(circle,var(--glow),transparent 70%)}.card:hover{transform:translateY(-4px);border-color:var(--col);box-shadow:0 18px 46px rgba(0,0,0,.28),0 0 30px var(--shadow)}.icon{font-size:38px;color:var(--col);filter:drop-shadow(0 0 14px var(--col))}.card h2{margin:0;font-size:24px;text-transform:uppercase}.card p{margin:0;color:var(--muted);font:12px/1.5 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em}.r3d{--col:var(--cyan);--shadow:rgba(72,233,255,.22);--glow:rgba(72,233,255,.22)}.r2d{--col:var(--green);--shadow:rgba(112,255,158,.2);--glow:rgba(112,255,158,.2)}.rp{--col:var(--gold);--shadow:rgba(246,182,74,.22);--glow:rgba(246,182,74,.22)}.status{margin-top:34px;color:var(--muted);font:12px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase}.status b{color:var(--green)}.version{padding:18px 26px;border-top:1px solid var(--line);color:rgba(239,248,255,.45);font:11px ui-monospace,monospace;letter-spacing:.08em;text-align:center}@media(max-width:860px){.routes{grid-template-columns:1fr}.top{align-items:flex-start;flex-direction:column}main{padding-top:38px}.card{min-height:160px}}
  </style>
</head>
<body>${body}<div class="version">LIVE_ENTRYPOINTS · ${buildSha.slice(0, 12)} · ${builtAt}</div></body>
</html>`;
}

function rootLandingPage() {
  if (existsSync(authoredLanding)) {
    let html = readFileSync(authoredLanding, 'utf8');
    html = html.replace(/<title>.*?<\/title>/, '<title>Areloria · 2D 3D Portal Selector</title>');
    html = html.replace('</head>', `  <meta http-equiv="Cache-Control" content="no-store" />\n  <meta name="areloria-entrypoints" content="LIVE_ENTRYPOINTS:${buildSha.slice(0, 12)}:${builtAt}" />\n</head>`);
    html = html.replace('</body>', `  <script>window.__ARELORIA_ENTRYPOINTS__={buildSha:${JSON.stringify(buildSha)},builtAt:${JSON.stringify(builtAt)},routes:['/2d/','/3d/','/portal/','/admin-dashboard/']};</script>\n  <!-- LIVE_ENTRYPOINTS · ${buildSha.slice(0, 12)} · ${builtAt} -->\n</body>`);
    return html;
  }

  const landingBody = `<div class="wrap"><section class="shell"><header class="top"><div class="brand"><span class="orb"></span>ARELORIA ONLINE</div><div>10-Hz Server · 2D/3D Clients · Portal</div></header><main><div class="kicker">Ouroboros MMORPG Runtime</div><h1>Willkommen in <span class="cyan">Areloria</span>.<br><span class="gold">Wähle deine Ebene.</span></h1><p class="lead">Dies ist der öffentliche Einstieg der laufenden Areloria-Welt. Der 2D-Client, der 3D-Client und das Portal sind getrennte Live-Ebenen und sollen echte Builds ausliefern.</p><nav class="routes"><a class="card r2d" href="/2d/"><div class="icon">▦</div><h2>2D Client</h2><p>Pixel-MMORPG, Mobile HUD, Stitch-Assets</p></a><a class="card r3d" href="/3d/"><div class="icon">⬡</div><h2>3D Client</h2><p>Browser-3D-Welt und GLB-Rendering</p></a><a class="card rp" href="/portal/"><div class="icon">⌬</div><h2>Portal</h2><p>ARE-Konsole, Status, Oracle, Governance</p></a><a class="card r3d" href="/admin-dashboard/"><div class="icon">▣</div><h2>Admin</h2><p>Runtime Command Center</p></a></nav><div class="status"><b>LIVE</b> · Root landing generated by runtime entrypoint writer</div></main></section></div>`;
  return page('Areloria · Live MMORPG', landingBody);
}

const portalBody = `<div class="wrap"><section class="shell"><header class="top"><div class="brand"><span class="orb"></span>ARELORIA PORTAL</div><div>PORTAL ONLINE · Read-only runtime surfaces</div></header><main><div class="kicker">Science Portal</div><h1>ARE <span class="cyan">Control</span>.<br><span class="gold">Truth Hub.</span></h1><p class="lead">Portal für Status, Replay, Governance, Warfront und Diagnose. Diese Seite ist bewusst schlank, damit sie im Deploy nicht den Game-Client überschreibt.</p><nav class="routes"><a class="card rp" href="/are-console.html"><div class="icon">⌬</div><h2>ARE Console</h2><p>Runtime, Replay, Oracle, Repair</p></a><a class="card r3d" href="/sovereign-truth.html"><div class="icon">◈</div><h2>Sovereign Truth</h2><p>Build, Commit, Runtime-Wahrheit</p></a><a class="card r2d" href="/"><div class="icon">↩</div><h2>Zur Landing</h2><p>Zurück zum Areloria Einstieg</p></a><a class="card r3d" href="/admin-dashboard/"><div class="icon">▣</div><h2>Admin</h2><p>Runtime Command Center</p></a></nav><div class="status"><b>PORTAL ONLINE</b> · Deterministic runtime hub</div></main></section></div>`;

writeFileSync(join(distRoot, 'index.html'), rootLandingPage());
writeFileSync(join(portalRoot, 'index.html'), page('Areloria · Portal', portalBody));
if (existsSync(join(distRoot, 'dashboard.html'))) copyFileSync(join(distRoot, 'dashboard.html'), join(adminDashboardRoot, 'index.html'));
writeFileSync(join(distRoot, 'runtime-build-info.json'), JSON.stringify({ ok: true, buildSha, builtAt, entrypoints: ['/', '/2d/', '/3d/', '/portal/', '/admin-dashboard/', '/are-console.html', '/sovereign-truth.html'] }, null, 2) + '\n');

for (const file of ['are-console.html', 'sovereign-truth.html']) {
  const source = join(publicRoot, file);
  const target = join(distRoot, file);
  if (existsSync(source)) copyFileSync(source, target);
}

console.log(`[RuntimeEntrypoints] wrote Areloria root landing + portal hub + admin dashboard route into ${distRoot}`);
