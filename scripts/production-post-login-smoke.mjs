#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const baseUrl = process.env.BASE_URL || 'https://arelorian.de';
const targetUrl = `${baseUrl.replace(/\/$/, '')}/2d/?cdp-smoke=${Date.now()}`;
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 90_000);
const debugPort = Number(process.env.CHROME_DEBUG_PORT || 9222);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  return candidates.find((path) => path && existsSync(path));
}

async function waitForJson(url, deadline) {
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function waitForPageTarget(deadline) {
  let lastTargets = [];
  while (Date.now() < deadline) {
    const targets = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`, deadline);
    lastTargets = targets;
    const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
    if (page) return page;
    await sleep(250);
  }
  throw new Error(`Timed out waiting for Chrome page target. targets=${JSON.stringify(lastTargets)}`);
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.seq = 0;
    this.pending = new Map();
    this.events = [];
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(`${message.error.message || 'CDP error'} ${JSON.stringify(message.error)}`));
        else resolve(message.result ?? {});
        return;
      }
      if (message.method) this.events.push(message);
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out connecting to Chrome DevTools WebSocket')), 15_000);
      this.ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      });
      this.ws.addEventListener('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  send(method, params = {}) {
    const id = ++this.seq;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(payload);
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Timed out waiting for CDP method ${method}`));
        }
      }, 20_000);
    });
  }

  async eval(expression, awaitPromise = true) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true,
      userGesture: true,
    });
    if (result.exceptionDetails) {
      throw new Error(`Evaluation failed: ${JSON.stringify(result.exceptionDetails)}`);
    }
    return result.result?.value;
  }

  close() {
    try { this.ws?.close(); } catch {}
  }
}

async function waitFor(client, label, expression, deadline) {
  let lastValue;
  while (Date.now() < deadline) {
    lastValue = await client.eval(expression).catch((error) => `ERROR: ${error.message}`);
    if (lastValue === true) {
      console.log(`[smoke] ${label}: OK`);
      return;
    }
    await sleep(500);
  }
  const bodyDataset = await client.eval('JSON.stringify(document.body?.dataset ?? {})').catch(() => '{}');
  const location = await client.eval('location.href').catch(() => 'unknown');
  throw new Error(`[smoke] Timed out waiting for ${label}. last=${String(lastValue)} location=${location} body.dataset=${bodyDataset}`);
}

async function main() {
  const chrome = findChrome();
  if (!chrome) {
    throw new Error('No Chrome/Chromium binary found on runner. Expected google-chrome, google-chrome-stable, chromium, or chromium-browser.');
  }

  const userDataDir = `/tmp/areloria-cdp-smoke-${process.pid}`;
  const chromeArgs = [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-sync',
    '--no-first-run',
    '--disable-features=Translate,BackForwardCache',
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${debugPort}`,
    'about:blank',
  ];

  console.log(`[smoke] launching ${chrome}`);
  const child = spawn(chrome, chromeArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (chunk) => process.stdout.write(`[chrome] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[chrome] ${chunk}`));

  const deadline = Date.now() + timeoutMs;
  let client;
  try {
    await waitForJson(`http://127.0.0.1:${debugPort}/json/version`, deadline);
    const pageTarget = await waitForPageTarget(deadline);
    console.log(`[smoke] connecting to page target ${pageTarget.id || pageTarget.url}`);
    client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Log.enable');
    await client.send('Network.enable');

    console.log(`[smoke] navigating to ${targetUrl}`);
    await client.send('Page.navigate', { url: targetUrl });

    await waitFor(client, 'document ready', 'document.readyState === "interactive" || document.readyState === "complete"', deadline);

    await client.eval(`(async () => {
      localStorage.clear();
      sessionStorage.clear();
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      return true;
    })()`);

    await client.send('Page.navigate', { url: `${targetUrl}&fresh=1` });
    await waitFor(client, 'login gate visible', 'Boolean(document.querySelector(`[data-testid="cyber-zen-login-gate"]`))', deadline);

    const clicked = await client.eval(`(() => {
      const buttons = [...document.querySelectorAll('button')];
      const button = buttons.find((b) => /collective betreten/i.test(b.textContent || ''));
      if (!button) return false;
      button.click();
      return true;
    })()`);
    if (!clicked) throw new Error('Could not find/click Collective betreten button');
    console.log('[smoke] clicked Collective betreten');

    await waitFor(client, 'post-login children root', 'Boolean(document.querySelector(`[data-testid="post-login-children-root"]`))', deadline);
    await waitFor(client, 'deterministic world root', 'Boolean(document.querySelector(`[data-testid="deterministic-world-root"]`))', deadline);
    await waitFor(client, 'Arelorian stitch HUD', 'Boolean(document.querySelector(`[data-testid="arelorian-stitch-hud"]`))', deadline);
    await waitFor(client, 'gameplay window dock', 'Boolean(document.querySelector(`[data-testid="gameplay-window-dock"]`))', deadline);
    await waitFor(client, 'character surface', 'Boolean(document.querySelector(`[data-testid="character-paperdoll-root"], [data-testid="character-select"], [data-testid="paperdoll-panel-live"]`))', deadline);

    const fatalCount = await client.eval('document.querySelectorAll(`[data-testid="boot-fatal-overlay"]`).length');
    if (fatalCount !== 0) throw new Error(`boot-fatal-overlay appeared (${fatalCount})`);

    console.log('[smoke] production post-login 2D flow OK');
  } finally {
    client?.close();
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 3000).unref?.();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
