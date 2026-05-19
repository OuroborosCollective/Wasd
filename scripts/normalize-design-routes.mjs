#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve(process.cwd());
const distRoot = join(repoRoot, 'client/dist');
const portalIndex = join(distRoot, 'portal/index.html');
const consoleRoute = '/are-console.html';

const replacements = new Map([
  ['/api/are/replay/oracle/prophecy', `${consoleRoute}#oracle-voice`],
  ['/api/are/replay/governance/status', `${consoleRoute}#governance-voice`],
  ['/api/are/replay/repair/status', `${consoleRoute}#repair-status`],
  ['/api/v1/warfront/cycle', `${consoleRoute}#warfront-voice`],
]);

if (existsSync(portalIndex)) {
  let html = readFileSync(portalIndex, 'utf8');
  for (const [from, to] of replacements) {
    html = html.split(`href="${from}"`).join(`href="${to}"`);
  }
  html = html
    .replace('Prophecy engine state generated from replay records', 'Readable prophecy voice generated from replay records')
    .replace('Read-only sovereign council state and directives', 'Readable council state and current directives')
    .replace('Live deterministic cycle and front boss truth payload', 'Readable warfront status and boss location')
    .replace('ARE repair and self-healing runtime status', 'Readable repair and self-healing status');
  writeFileSync(portalIndex, html);
}

writeFileSync(
  join(distRoot, 'design-routes.json'),
  JSON.stringify(
    {
      ok: true,
      rule: 'Visible design routes should open HTML views. Raw JSON APIs remain available through explicit API/debug links.',
      htmlRoutes: ['/', '/portal/', '/are-console.html', '/sovereign-truth.html', '/2d/', '/3d/'],
      apiRoutes: [
        '/api/are/replay/stats',
        '/api/are/replay/oracle/prophecy',
        '/api/are/replay/governance/status',
        '/api/are/replay/repair/status',
        '/api/are/replay/billing/status',
        '/api/v1/warfront/cycle',
      ],
      normalizedPortalLinks: Object.fromEntries(replacements),
    },
    null,
    2,
  ) + '\n',
);

console.log('[DesignRoutes] normalized portal links and wrote client/dist/design-routes.json');
