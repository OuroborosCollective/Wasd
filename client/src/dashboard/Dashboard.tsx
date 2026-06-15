/**
 * @file client/src/dashboard/Dashboard.tsx
 * @description Administrator command center for Areloria runtime operations.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { WorldProvider } from './context/WorldContext';
import { WorldStatusHeader } from './components/WorldStatusHeader';
import { RegionGrid } from './components/RegionGrid';
import { EventLog } from './components/EventLog';
import { ToastContainer } from './components/Toast';
import { AREShadowPanel } from './components/AREShadowPanel';
import LivingDudenShadowWindow from './components/LivingDudenShadowWindow';

type JsonRecord = Record<string, unknown>;
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

interface RuntimePanelState {
  readonly status: LoadState;
  readonly updatedAt: string | null;
  readonly error: string | null;
  readonly health: JsonRecord | null;
  readonly observability: JsonRecord | null;
  readonly clientEntrypoints: JsonRecord | null;
  readonly clientConfig: JsonRecord | null;
  readonly buildInfo: JsonRecord | null;
  readonly manifest: JsonRecord | null;
}

const REFRESH_MS = 15000;
const COMMAND_LINKS = [
  ['/health/observability', 'Observability', 'Runtime evidence'],
  ['/health/ready', 'Readiness', 'Container readiness'],
  ['/health/determinism', 'Determinism', 'Guard and replay state'],
  ['/health/worldhash', 'World Hash', 'Authoritative hash snapshot'],
  ['/api/manifest/status', 'Manifest', 'State manifest status'],
  ['/api/are-shadow/stats?lines=400', 'Shadow Stats', 'ARE side-channel stats'],
  ['/2d/', '2D Client', 'Primary player client'],
  ['/portal/', 'Portal', 'Science portal'],
] as const;

async function fetchJson(path: string): Promise<JsonRecord> {
  const response = await fetch(path, { cache: 'no-store' });
  const text = await response.text();
  let parsed: unknown = {};
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text.slice(0, 400) }; }
  if (!response.ok) return { ok: false, httpStatus: response.status, payload: parsed };
  return typeof parsed === 'object' && parsed !== null ? parsed as JsonRecord : { value: parsed };
}

function nested(source: JsonRecord | null, path: string): unknown {
  if (!source) return undefined;
  return path.split('.').reduce<unknown>((cursor, key) => {
    if (cursor && typeof cursor === 'object' && key in cursor) return (cursor as JsonRecord)[key];
    return undefined;
  }, source);
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function runtimeUpdateLabel(observability: JsonRecord | null, health: JsonRecord | null): string {
  const tick = num(nested(observability, 'tick.current') ?? nested(health, 'tick.current') ?? nested(health, 'tick'));
  return tick >= 0 ? `tick ${tick}` : 'runtime response';
}

function okClass(ok: boolean): string {
  return ok ? 'border-emerald-400/60 bg-emerald-950/30 text-emerald-100' : 'border-orange-400/70 bg-orange-950/35 text-orange-100';
}

function MetricCard({ label, value, detail, ok }: { readonly label: string; readonly value: string; readonly detail: string; readonly ok: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-xl ${okClass(ok)}`}>
      <div className="text-xs uppercase tracking-[0.24em] opacity-75">{label}</div>
      <div className="mt-2 font-mono text-2xl font-black sm:text-3xl">{value}</div>
      <div className="mt-2 min-h-10 text-sm opacity-80">{detail}</div>
    </div>
  );
}

function JsonPreview({ title, data }: { readonly title: string; readonly data: unknown }) {
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-300">{title}</h3>
      <pre className="max-h-72 overflow-auto rounded-xl bg-black/55 p-3 text-[11px] leading-relaxed text-cyan-100">{JSON.stringify(data ?? { status: 'unavailable' }, null, 2)}</pre>
    </section>
  );
}

function DashboardContent() {
  const [panel, setPanel] = useState<RuntimePanelState>({ status: 'idle', updatedAt: null, error: null, health: null, observability: null, clientEntrypoints: null, clientConfig: null, buildInfo: null, manifest: null });

  const loadRuntime = useCallback(async () => {
    setPanel((previous) => ({ ...previous, status: previous.status === 'idle' ? 'loading' : previous.status, error: null }));
    try {
      const [health, observability, clientEntrypoints, clientConfig, buildInfo, manifest] = await Promise.all([
        fetchJson('/health').catch((error) => ({ ok: false, error: String(error) })),
        fetchJson('/health/observability').catch((error) => ({ ok: false, error: String(error) })),
        fetchJson('/health/client-entrypoints').catch((error) => ({ ok: false, error: String(error) })),
        fetchJson('/client-config.json').catch((error) => ({ ok: false, error: String(error) })),
        fetchJson('/runtime-build-info.json').catch((error) => ({ ok: false, error: String(error) })),
        fetchJson('/api/manifest/status').catch((error) => ({ ok: false, error: String(error) })),
      ]);
      setPanel({ status: 'ready', updatedAt: runtimeUpdateLabel(observability, health), error: null, health, observability, clientEntrypoints, clientConfig, buildInfo, manifest });
    } catch (error) {
      setPanel((previous) => ({ ...previous, status: 'error', error: error instanceof Error ? error.message : String(error) }));
    }
  }, []);

  useEffect(() => {
    void loadRuntime();
    const id = window.setInterval(() => void loadRuntime(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [loadRuntime]);

  const derived = useMemo(() => {
    const obs = panel.observability;
    const assetFailures = nested(obs, 'assets.failures');
    const persistenceFailures = nested(obs, 'persistence.failures');
    const playtesterEnabled = nested(obs, 'playtester.enabled');
    const buildSha = String(nested(panel.buildInfo, 'buildSha') ?? nested(panel.clientConfig, 'buildHash') ?? 'unknown');
    return {
      ok: obs?.ok === true,
      tick: num(nested(obs, 'tick.current')),
      wsClients: num(nested(obs, 'websocket.activeClients')),
      wsMessages: num(nested(obs, 'websocket.totalMessages')),
      manifestStatus: String(nested(obs, 'manifest.status') ?? 'unknown'),
      persistenceFailureCount: Array.isArray(persistenceFailures) ? persistenceFailures.length : 0,
      assetFailureCount: Array.isArray(assetFailures) ? assetFailures.length : 0,
      playtester: playtesterEnabled === true ? 'enabled' : 'disabled',
      buildSha,
    };
  }, [panel]);

  return (
    <main className="min-h-screen bg-[#050606] text-white">
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-5 lg:px-8">
        <header className="sticky top-0 z-20 -mx-3 mb-4 border-b border-cyan-400/20 bg-[#050606]/92 px-3 py-4 backdrop-blur sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">Administrator Command Center</div>
              <h1 className="mt-2 text-4xl font-black tracking-[-0.07em] sm:text-6xl">ARELORIA CONTROL</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Runtime evidence, release gates, world state, shadow telemetry and command links in one Android-tablet-ready cockpit.</p>
            </div>
            <button onClick={() => void loadRuntime()} className="min-h-12 rounded-2xl border border-cyan-300 bg-cyan-400/10 px-5 text-sm font-bold uppercase tracking-[0.18em] text-cyan-100">Refresh</button>
          </div>
        </header>

        <WorldStatusHeader />

        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
          <MetricCard label="Runtime" value={derived.ok ? 'OK' : 'CHECK'} detail={panel.status === 'ready' ? `Updated ${panel.updatedAt}` : panel.status} ok={derived.ok} />
          <MetricCard label="Tick" value={String(derived.tick || '---')} detail="10Hz loop" ok={derived.tick >= 0} />
          <MetricCard label="WS Clients" value={String(derived.wsClients)} detail={`${derived.wsMessages} total messages`} ok={derived.wsClients >= 0} />
          <MetricCard label="Manifest" value={derived.manifestStatus.toUpperCase()} detail="state hash visibility" ok={derived.manifestStatus === 'available'} />
          <MetricCard label="Persistence" value={String(derived.persistenceFailureCount)} detail="failure count" ok={derived.persistenceFailureCount === 0} />
          <MetricCard label="Assets" value={String(derived.assetFailureCount)} detail="entrypoint failures" ok={derived.assetFailureCount === 0} />
          <MetricCard label="Playtester" value={derived.playtester.toUpperCase()} detail="sentinel status" ok={true} />
          <MetricCard label="Build" value={derived.buildSha.slice(0, 8)} detail="runtime commit" ok={derived.buildSha !== 'unknown'} />
        </section>

        {panel.error ? <div className="mb-5 rounded-2xl border border-red-400/70 bg-red-950/40 p-4 text-red-100">{panel.error}</div> : null}

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {COMMAND_LINKS.map(([href, label, description]) => (
            <a key={href} href={href} className="min-h-24 rounded-2xl border border-cyan-400/35 bg-slate-950/55 p-4 transition hover:border-cyan-300 hover:bg-cyan-950/25 active:scale-[0.99]">
              <div className="text-base font-black uppercase tracking-[0.16em]">{label}</div>
              <div className="mt-2 text-sm text-slate-400">{description}</div>
              <div className="mt-3 font-mono text-xs text-cyan-200">{href}</div>
            </a>
          ))}
        </section>

        <section className="mb-5 grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4"><h2 className="mb-3 text-xl font-black text-slate-200">Regions</h2><RegionGrid /></div>
          <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4"><EventLog /></div>
        </section>

        <section className="mb-5 grid gap-4 2xl:grid-cols-2"><AREShadowPanel /><LivingDudenShadowWindow /></section>

        <section className="grid gap-4 xl:grid-cols-3">
          <JsonPreview title="Observability" data={panel.observability} />
          <JsonPreview title="Health" data={panel.health} />
          <JsonPreview title="Entrypoints" data={panel.clientEntrypoints} />
          <JsonPreview title="Manifest" data={panel.manifest} />
          <JsonPreview title="Client Config" data={panel.clientConfig} />
          <JsonPreview title="Build Info" data={panel.buildInfo} />
        </section>

        <ToastContainer />
      </div>
    </main>
  );
}

export function Dashboard() {
  return <WorldProvider><DashboardContent /></WorldProvider>;
}

export default Dashboard;
