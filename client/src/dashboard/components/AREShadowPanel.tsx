import { useCallback, useEffect, useMemo, useState } from 'react';

type ShadowStatus = 'loading' | 'live' | 'empty' | 'error';

type ShadowEntry = {
  readonly tick?: number;
  readonly latestTick?: number | null;
  readonly latestStateHash?: string | null;
  readonly capacity?: number | null;
  readonly size?: number | null;
  readonly type?: string;
  readonly status?: string;
  readonly probeHash?: number | string;
  readonly discrepancy?: string | null;
  readonly recommendation?: string | null;
  readonly ecosystem?: unknown;
};

type ShadowLogResponse = {
  readonly ok?: boolean;
  readonly entries?: readonly ShadowEntry[];
  readonly returnedLines?: number;
  readonly message?: string;
};

type ShadowStatsResponse = {
  readonly ok?: boolean;
  readonly available?: boolean;
  readonly totalLogLines?: number;
  readonly analyzedLines?: number;
  readonly tickRange?: { readonly min: number; readonly max: number; readonly span: number } | null;
  readonly ecosystemEvents?: { readonly capsules: number; readonly apexNpcs: number; readonly fusions: number };
  readonly latestEntry?: ShadowEntry | null;
  readonly message?: string;
};

type ShadowTelemetryResponse = {
  readonly ok?: boolean;
  readonly telemetry?: Record<string, unknown>;
  readonly message?: string;
};

type ShadowPoint = {
  readonly label: string;
  readonly tick: number;
  readonly buffer: number;
  readonly antigen: number;
  readonly probes: number;
};

const POLL_MS = 4000;
const MAX_POINTS = 24;

function numberOr(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function lastOf<T>(items: readonly T[] | undefined): T | undefined {
  return items && items.length > 0 ? items[items.length - 1] : undefined;
}

function classifyAntigen(entry: ShadowEntry): number {
  let score = 0;
  if (entry.type === 'ARE_SHADOW_PROBE') score += 18;
  if (entry.status === 'warning') score += 28;
  if (entry.status === 'fail') score += 60;
  if (entry.discrepancy) score += 20;
  if (entry.recommendation) score += 8;
  return Math.min(100, score);
}

function formatTick(tick: number): string {
  return `T${Math.trunc(tick).toString().padStart(4, '0')}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return (await response.json()) as T;
}

function MiniTrend({ points }: { points: readonly ShadowPoint[] }) {
  const width = 320;
  const height = 110;
  const series = points.length > 1 ? points : [{ label: 'T0000', tick: 0, buffer: 0, antigen: 0, probes: 0 }, ...points];
  const path = series.map((point, index) => {
    const x = (index / Math.max(1, series.length - 1)) * width;
    const y = height - (Math.min(100, point.antigen) / 100) * height;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full overflow-visible">
      <path d="M0,110 L320,110" stroke="rgba(148,163,184,.22)" />
      <path d="M0,55 L320,55" stroke="rgba(148,163,184,.16)" />
      <path d={path} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
      {series.map((point, index) => {
        const x = (index / Math.max(1, series.length - 1)) * width;
        const y = height - (Math.min(100, point.antigen) / 100) * height;
        return <circle key={`${point.label}-${index}`} cx={x} cy={y} r="3" fill="#a78bfa" />;
      })}
    </svg>
  );
}

export function AREShadowPanel() {
  const [status, setStatus] = useState<ShadowStatus>('loading');
  const [log, setLog] = useState<ShadowLogResponse | null>(null);
  const [stats, setStats] = useState<ShadowStatsResponse | null>(null);
  const [telemetry, setTelemetry] = useState<ShadowTelemetryResponse | null>(null);
  const [points, setPoints] = useState<readonly ShadowPoint[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const probes = useMemo(() => (log?.entries ?? []).filter((entry) => entry.type === 'ARE_SHADOW_PROBE'), [log]);
  const latestEntry = stats?.latestEntry ?? lastOf(log?.entries) ?? null;
  const latestTick = numberOr(latestEntry?.latestTick ?? latestEntry?.tick, 0);
  const latestHash = latestEntry?.latestStateHash ?? latestEntry?.probeHash ?? '—';
  const antigen = useMemo(() => (log?.entries ?? []).reduce((max, entry) => Math.max(max, classifyAntigen(entry)), 0), [log]);
  const heartbeatLabel = status === 'live' ? 'SHADOW LIVE' : status === 'empty' ? 'NO SHADOW LOG' : status === 'error' ? 'SHADOW ERROR' : 'LOADING';

  const refresh = useCallback(async () => {
    try {
      const [nextLog, nextStats, nextTelemetry] = await Promise.all([
        fetchJson<ShadowLogResponse>('/api/are-shadow/log?lines=160'),
        fetchJson<ShadowStatsResponse>('/api/are-shadow/stats?lines=400'),
        fetchJson<ShadowTelemetryResponse>('/api/are-shadow/telemetry'),
      ]);
      const lastEntry = nextStats.latestEntry ?? lastOf(nextLog.entries);
      setLog(nextLog);
      setStats(nextStats);
      setTelemetry(nextTelemetry);
      setLastError(null);
      setStatus((nextLog.entries?.length ?? 0) > 0 || Boolean(nextStats.latestEntry) ? 'live' : 'empty');
      const tick = numberOr(lastEntry?.latestTick ?? lastEntry?.tick, 0);
      const buffer = numberOr(lastEntry?.size, 0);
      const probeCount = (nextLog.entries ?? []).filter((entry) => entry.type === 'ARE_SHADOW_PROBE').length;
      const antigenScore = (nextLog.entries ?? []).reduce((max, entry) => Math.max(max, classifyAntigen(entry)), 0);
      setPoints((prev) => Object.freeze([...prev.slice(-(MAX_POINTS - 1)), Object.freeze({ label: formatTick(tick), tick, buffer, antigen: antigenScore, probes: probeCount })]));
    } catch (error) {
      setStatus('error');
      setLastError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const run = async () => { if (alive) await refresh(); };
    void run();
    const timer = window.setInterval(() => void run(), POLL_MS);
    return () => { alive = false; window.clearInterval(timer); };
  }, [refresh]);

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-slate-900/90 p-4 shadow-2xl shadow-cyan-950/20 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 text-xs font-mono uppercase tracking-[0.22em] text-cyan-300">ARE Shadow Control Plane</div>
          <h2 className="text-2xl font-black tracking-tight">Shadow Logs · Heartbeat · Antigen Monitor</h2>
          <p className="mt-1 text-sm text-slate-400">Side-channel telemetry only. It observes tests, probes and replay pressure without mutating gameplay truth.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 px-3 py-1 text-xs font-mono text-cyan-200">
          <span className={`h-2 w-2 rounded-full ${status === 'live' ? 'bg-emerald-400 animate-pulse' : status === 'error' ? 'bg-rose-400' : 'bg-amber-300'}`} />
          {heartbeatLabel}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-xs uppercase text-slate-400">Latest Tick</div><div className="mt-2 text-2xl font-black">{latestTick || '—'}</div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-xs uppercase text-slate-400">Entries</div><div className="mt-2 text-2xl font-black">{stats?.totalLogLines ?? log?.returnedLines ?? '—'}</div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-xs uppercase text-slate-400">Antigen Index</div><div className="mt-2 text-2xl font-black">{antigen}</div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-xs uppercase text-slate-400">Shadow Probes</div><div className="mt-2 text-2xl font-black">{probes.length}</div></div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><MiniTrend points={points} /></div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="mb-3 font-bold">Latest Shadow Events</h3>
          <div className="max-h-64 space-y-2 overflow-auto pr-2 text-xs font-mono">
            {lastError ? <div className="text-rose-300">{lastError}</div> : null}
            {(log?.entries ?? []).slice(-8).reverse().map((entry, index) => (
              <div key={`${entry.tick ?? index}-${entry.latestStateHash ?? entry.probeHash ?? index}`} className="rounded border border-slate-800 bg-slate-900/80 p-2">
                <div className="flex justify-between gap-3 text-slate-300"><span>{entry.type ?? 'TICK'}</span><span>{entry.tick ?? entry.latestTick ?? '—'}</span></div>
                <div className="truncate text-slate-500">hash: {String(entry.latestStateHash ?? entry.probeHash ?? '—')}</div>
                {entry.discrepancy ? <div className="mt-1 text-amber-300">{entry.discrepancy}</div> : null}
                {entry.recommendation ? <div className="mt-1 text-cyan-300">{entry.recommendation}</div> : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 text-xs text-slate-400 lg:grid-cols-2">
        <pre className="max-h-56 overflow-auto rounded-xl border border-slate-800 bg-slate-950/70 p-4">{JSON.stringify({ latestHash, tickRange: stats?.tickRange ?? null, ecosystemEvents: stats?.ecosystemEvents ?? null }, null, 2)}</pre>
        <pre className="max-h-56 overflow-auto rounded-xl border border-slate-800 bg-slate-950/70 p-4">{JSON.stringify(telemetry?.telemetry ?? { available: false, message: telemetry?.message ?? 'waiting' }, null, 2)}</pre>
      </div>
    </section>
  );
}

export default AREShadowPanel;
