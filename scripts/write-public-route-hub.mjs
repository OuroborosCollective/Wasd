#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = process.cwd();
const distRoot = join(repoRoot, 'dist');
const publicRoot = join(repoRoot, 'public');
const portalRoot = join(distRoot, 'portal');
const client3DRoot = join(distRoot, '3d');
const appsRoot = join(distRoot, 'apps');
const buildSha = process.env.GITHUB_SHA || process.env.BUILD_COMMIT_SHA || 'local';
const builtAt = new Date().toISOString();

for (const dir of [distRoot, portalRoot, client3DRoot, appsRoot]) mkdirSync(dir, { recursive: true });

const css = `:root{color-scheme:dark;--bg:#050606;--cyan:#00e5ff;--green:#39ff14;--fire:#ff7a00;--violet:#a77cff;--line:rgba(148,163,184,.28);--muted:#93a4aa;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 55% 20%,rgba(0,229,255,.22),transparent 28rem),radial-gradient(circle at 80% 62%,rgba(255,122,0,.18),transparent 32rem),linear-gradient(rgba(0,229,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,.03) 1px,transparent 1px),var(--bg);background-size:auto,auto,44px 44px,44px 44px,auto;color:#effcff}a{color:inherit;text-decoration:none}.shell{min-height:100vh;display:grid;grid-template-columns:280px 1fr}.rail{border-right:1px solid var(--line);background:rgba(2,13,15,.88);padding:28px 24px;display:flex;flex-direction:column}.brand{font-size:38px;line-height:.9;font-weight:950;letter-spacing:-.06em}.sub{margin-top:12px;color:var(--muted);font:12px ui-monospace,monospace;letter-spacing:.22em}.nodes{display:grid;gap:16px;margin-top:48px;color:rgba(232,250,255,.62);font:13px ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase}.sync{margin-top:auto;border:1px solid var(--cyan);color:var(--cyan);padding:16px;text-align:center;font:12px ui-monospace,monospace;letter-spacing:.16em}.main{padding:18px 28px 42px}.top{height:38px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;color:var(--cyan);font:12px ui-monospace,monospace;letter-spacing:.08em}.hero{min-height:calc(100vh - 90px);display:grid;place-items:center;text-align:center}.sigil{width:180px;height:180px;margin:0 auto 30px;border-radius:30px;border:1px solid rgba(0,229,255,.42);display:grid;place-items:center;background:rgba(0,0,0,.66);box-shadow:0 0 44px rgba(0,229,255,.2)}.ouro{width:110px;height:110px;border-radius:50%;border:9px solid var(--fire);box-shadow:0 0 20px var(--fire),inset 0 0 24px rgba(0,229,255,.4)}h1{margin:0;font-size:clamp(44px,7vw,78px);line-height:.95;letter-spacing:-.06em;text-transform:uppercase}.cyan{color:var(--cyan)}.fire{color:var(--fire)}.tag{max-width:820px;margin:22px auto 38px;color:#aebcc1;font:13px/1.7 ui-monospace,monospace}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:22px;max-width:1180px;margin:0 auto}.card{min-height:180px;border-radius:30px;border:1px solid rgba(148,163,184,.34);background:rgba(8,18,20,.68);display:grid;align-content:center;justify-items:center;gap:10px;padding:24px;transition:.18s}.card:hover{transform:translateY(-4px);border-color:var(--col);box-shadow:0 0 36px var(--shadow)}.icon{font-size:38px;color:var(--col)}.card h2{margin:4px 0 0;font-size:22px;text-transform:uppercase}.card p{margin:0;color:#aebcc1;font:11px/1.45 ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase}.r3d{--col:#00e5ff;--shadow:rgba(0,229,255,.22)}.r2d{--col:#39ff14;--shadow:rgba(57,255,20,.22)}.rp{--col:#ff7a00;--shadow:rgba(255,122,0,.24)}.gov{--col:#a77cff;--shadow:rgba(167,124,255,.25)}.status{margin-top:30px;color:rgba(174,188,193,.72);font:12px ui-monospace,monospace;letter-spacing:.12em}.version{position:fixed;right:10px;bottom:8px;color:rgba(239,252,255,.45);font:10px ui-monospace,monospace}@media(max-width:900px){.shell{grid-template-columns:1fr}.rail{border-right:0;border-bottom:1px solid var(--line);padding:18px;flex-direction:row;align-items:center}.brand{font-size:26px}.sub,.nodes{display:none}.sync{margin-left:auto;margin-top:0}.top span{display:none}.main{padding:16px}}`;

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><meta name="theme-color" content="#050606"/><meta http-equiv="Cache-Control" content="no-store"/><title>${title}</title><style>${css}</style></head><body>${body}<div class="version">${buildSha.slice(0,12)} · ${builtAt}</div></body></html>`;
}

function card(cls, href, icon, title, text) {
  return `<a class="card ${cls}" href="${href}"><i class="icon">${icon}</i><h2>${title}</h2><p>${text}</p></a>`;
}

function shell({ brand, sub, nodes, ctaHref, cta, top, headline, text, cards, status }) {
  return `<div class="shell"><aside class="rail"><div><div class="brand">${brand}</div><div class="sub">${sub}</div></div><nav class="nodes">${nodes.map((n) => `<span>${n}</span>`).join('')}</nav><a class="sync" href="${ctaHref}">${cta}</a></aside><main class="main"><div class="top"><b>${top}</b><span>2D · 3D · SCIENCE · TOOLS</span></div><section class="hero"><div><div class="sigil"><div class="ouro"></div></div><h1>${headline}</h1><p class="tag">${text}</p><div class="grid">${cards.join('')}</div><div class="status">${status}</div></div></section></main></div>`;
}



writeFileSync(join(distRoot, 'index.html'), page('Areloria · Landing', shell({
  brand: 'ARELORIA',
  sub: 'LIVE ENTRY HUB',
  nodes: ['Landing_Page', '2D_Stitch_Client', '3D_Client', 'Science_Portal', 'Sovereign_Tools'],
  ctaHref: '/2d/',
  cta: 'ENTER_2D_STITCH',
  top: 'OUROBOROS // LANDING',
  headline: 'CHOOSE <span class="cyan">YOUR</span><br/>REALITY <span class="fire">LAYER.</span>',
  text: 'Public landing page for the Areloria loop. Pick the 2D Stitch client, 3D world client, Science Portal, or the Sovereign Tools hub for education, industry and automation surfaces.',
  cards: [card('r2d','/2d/','▦','Game Client 2D','Stitch HUD · login gate · pixel MMORPG'), card('r3d','/3d/','⬡','Game Client 3D','Volumetric world render engine'), card('rp','/portal/','⌬','Science Portal','ARE console · oracle · governance · truth'), card('gov','/apps/','⚙','Sovereign Tools','School · university · science · factory · automation')],
  status: 'ROOT IS LANDING · ROUTES ARE EXPLICIT · 10HZ SAFE',
})));

writeFileSync(join(portalRoot, 'index.html'), page('Areloria · Science Portal', shell({
  brand: 'SCIENCE<br/>PORTAL',
  sub: 'ARE CONTROL ROOM',
  nodes: ['ARE_Console', 'Sovereign_Truth', 'Oracle_Core', 'Replay_Ring', 'Warfront_Cycle'],
  ctaHref: '/',
  cta: 'RETURN_LANDING',
  top: 'OUROBOROS // SCIENCE PORTAL',
  headline: 'SCIENCE <span class="cyan">PORTAL.</span><br/>TRUTH <span class="fire">ONLINE.</span>',
  text: 'Read-only runtime visibility. This is not the public landing page; it is the control room.',
  cards: [card('r3d','/are-console.html','⌬','ARE Console','Replay / Oracle / AutoRepair / Billing'), card('rp','/sovereign-truth.html','◈','Sovereign Truth','Commit / Branch / Runtime / Supabase'), card('r2d','/api/v1/warfront/cycle','⚔','Warfront Cycle','Live deterministic cycle'), card('gov','/api/are/replay/governance/status','⚖','Governance','Read-only council state'), card('r3d','/api/are/replay/oracle/prophecy','◎','Oracle','Prophecy from replay records'), card('rp','/api/are/replay/repair/status','✚','AutoRepair','Repair status')],
  status: 'SCIENCE PORTAL ONLINE [READ_ONLY_SAFE]',
})));

writeFileSync(join(appsRoot, 'index.html'), page('Areloria · Sovereign Tools', shell({
  brand: 'SOVEREIGN<br/>TOOLS',
  sub: 'OUTER LOOP APPS',
  nodes: ['Automation_RobotArm', 'Science_Tool', 'School_Tool', 'University_Tool', 'Factory_Tool', 'Economy_Control'],
  ctaHref: '/',
  cta: 'RETURN_LANDING',
  top: 'OUROBOROS // SOVEREIGN TOOLS',
  headline: 'TOOLS <span class="cyan">OUTSIDE.</span><br/>LOOP <span class="fire">INSIDE.</span>',
  text: 'A structured hub for the economy, education, science, industry and automation tools around the game engine. These tools operate outside the live world simulation, but remain inside the Ouroboros cycle.',
  cards: [card('r2d','/apps/automation.html','🤖','Automation Tool','Robot arm workflows and external automation'), card('r3d','/apps/science.html','🔬','Science Tool','Research instruments and experiment dashboards'), card('rp','/apps/school.html','🎒','School Tool','Learning paths and child-friendly modules'), card('gov','/apps/university.html','🎓','University Tool','Advanced curriculum and research tracks'), card('r2d','/apps/factory.html','🏭','Factory Tool','Industry, logistics and production control'), card('r3d','/apps/economy.html','◇','Economy Control','Markets, guild industry and resource overview'), card('rp','/admin-content.html','✎','Admin Content','Content editing surface if bundled'), card('gov','/playtester-monitor.html','◉','Playtester Monitor','Remote QA if enabled')],
  status: 'SOVEREIGN TOOLS HUB ONLINE · OUTER ECONOMY VISIBLE',
})));

writeFileSync(join(distRoot, 'runtime-build-info.json'), JSON.stringify({ ok: true, buildSha, builtAt, entrypoints: ['/', '/2d/', '/3d/', '/portal/', '/apps/', '/are-console.html', '/sovereign-truth.html'] }, null, 2) + '\n');

for (const file of ['are-console.html', 'sovereign-truth.html']) {
  const source = join(publicRoot, file);
  const target = join(distRoot, file);
  if (existsSync(source)) copyFileSync(source, target);
}


// Copy the written index.html to 3d/index.html as a fallback/mirror
copyFileSync(join(distRoot, 'index.html'), join(client3DRoot, 'index.html'));
console.log(`[PublicRouteHub] wrote landing, science portal, 3d and sovereign tools hubs into ${distRoot}`);
