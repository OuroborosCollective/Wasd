#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve(process.cwd());
const distRoot = join(repoRoot, 'client/dist');
const portalIndex = join(distRoot, 'portal/index.html');
const consoleIndex = join(distRoot, 'are-console.html');
const consoleRoute = '/are-console.html';

const visibleRouteMap = new Map([
  ['/api/are/replay/stats', `${consoleRoute}#replay-summary`],
  ['/api/are/replay/oracle/prophecy', `${consoleRoute}#oracle-voice`],
  ['/api/are/replay/governance/status', `${consoleRoute}#governance-voice`],
  ['/api/are/replay/repair/status', `${consoleRoute}#repair-status`],
  ['/api/v1/warfront/cycle', `${consoleRoute}#warfront-voice`],
]);

function replaceLinks(html) {
  for (const [from, to] of visibleRouteMap) {
    html = html.split(`href="${from}"`).join(`href="${to}"`);
  }
  return html;
}

if (existsSync(portalIndex)) {
  let html = replaceLinks(readFileSync(portalIndex, 'utf8'));
  html = html
    .replace('Prophecy engine state generated from replay records', 'Readable prophecy voice generated from replay records')
    .replace('Read-only sovereign council state and directives', 'Readable council state and current directives')
    .replace('Live deterministic cycle and front boss truth payload', 'Readable warfront status and boss location')
    .replace('ARE repair and self-healing runtime status', 'Readable repair and self-healing status');
  writeFileSync(portalIndex, html);
}

if (existsSync(consoleIndex)) {
  let html = replaceLinks(readFileSync(consoleIndex, 'utf8'));
  html = html
    .replace('>Replay API<', '>Replay Voice<')
    .replace('>Oracle API<', '>Oracle Voice<')
    .replace('>Warfront API<', '>Warfront Voice<')
    .replace('<section class="grid" id="cards"></section>', '<section id="replay-summary" class="grid" id="cards"></section>')
    .replace('<article class="card oracle-card">', '<article id="oracle-voice" class="card oracle-card">')
    .replace('<article class="card"><div class="label">Governance Voice</div>', '<article id="governance-voice" class="card"><div class="label">Governance Voice</div>')
    .replace('<article class="card"><div class="label">Warfront Voice</div>', '<article id="warfront-voice" class="card"><div class="label">Warfront Voice</div>')
    .replace('<details><summary>Raw Warfront JSON</summary>', '<details id="repair-status"><summary>Raw Warfront JSON</summary>');
  writeFileSync(consoleIndex, html);
}

writeFileSync(
  join(distRoot, 'design-routes.json'),
  JSON.stringify(
    {
      ok: true,
      rule: 'Visible design routes open HTML views. Raw JSON APIs remain debug endpoints only.',
      htmlRoutes: ['/', '/portal/', '/are-console.html', '/sovereign-truth.html', '/2d/', '/3d/'],
      apiRoutes: [
        '/api/are/replay/stats',
        '/api/are/replay/oracle/prophecy',
        '/api/are/replay/governance/status',
        '/api/are/replay/repair/status',
        '/api/are/replay/billing/status',
        '/api/v1/warfront/cycle',
      ],
      normalizedVisibleLinks: Object.fromEntries(visibleRouteMap),
    },
    null,
    2,
  ) + '\n',
);

console.log('[DesignRoutes] normalized visible links and wrote client/dist/design-routes.json');
