"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Activity,
  HeartPulse,
  ShieldCheck,
  FileText,
  Radio,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ShadowEntry {
  readonly tick?: number;
  readonly at?: string;
  readonly latestTick?: number | null;
  readonly latestEntityId?: string | null;
  readonly latestStateHash?: string | null;
  readonly capacity?: number | null;
  readonly size?: number | null;
  readonly type?: string;
  readonly status?: string;
  readonly probeHash?: number | string;
  readonly discrepancy?: string | null;
  readonly recommendation?: string | null;
  readonly truthPath?: string;
  readonly ecosystem?: unknown;
}

interface ShadowLogResponse {
  readonly ok?: boolean;
  readonly entries?: readonly ShadowEntry[];
  readonly returnedLines?: number;
  readonly error?: string;
  readonly message?: string;
}

interface ShadowStatsResponse {
  readonly ok?: boolean;
  readonly available?: boolean;
  readonly totalLogLines?: number;
  readonly analyzedLines?: number;
  readonly tickRange?: { readonly min: number; readonly max: number; readonly span: number } | null;
  readonly ecosystemEvents?: { readonly capsules: number; readonly apexNpcs: number; readonly fusions: number };
  readonly latestEntry?: ShadowEntry | null;
  readonly message?: string;
}

interface ShadowTelemetryResponse {
  readonly ok?: boolean;
  readonly telemetry?: Record<string, unknown>;
  readonly message?: string;
}

interface ShadowPoint {
  readonly label: string;
  readonly tick: number;
  readonly buffer: number;
  readonly antigen: number;
  readonly probes: number;
}

type ShadowStatus = "loading" | "live" | "empty" | "error";

const POLL_MS = 4_000;
const MAX_POINTS = 24;

function numberOr(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function classifyAntigen(entry: ShadowEntry): number {
  let score = 0;
  if (entry.type === "ARE_SHADOW_PROBE") score += 18;
  if (entry.status === "warning") score += 28;
  if (entry.status === "fail") score += 60;
  if (entry.discrepancy) score += 20;
  if (entry.recommendation) score += 8;
  return Math.min(100, score);
}

function formatTick(tick: number): string {
  return `T${Math.trunc(tick).toString().padStart(4, "0")}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return (await res.json()) as T;
}

export function AREShadowPanel() {
  const [status, setStatus] = useState<ShadowStatus>("loading");
  const [log, setLog] = useState<ShadowLogResponse | null>(null);
  const [stats, setStats] = useState<ShadowStatsResponse | null>(null);
  const [telemetry, setTelemetry] = useState<ShadowTelemetryResponse | null>(null);
  const [points, setPoints] = useState<readonly ShadowPoint[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const probes = useMemo(
    () => (log?.entries ?? []).filter((entry) => entry.type === "ARE_SHADOW_PROBE"),
    [log],
  );

  const latestEntry = stats?.latestEntry ?? log?.entries?.[log.entries.length - 1] ?? null;
  const latestTick = numberOr(latestEntry?.latestTick ?? latestEntry?.tick, 0);
  const latestHash = latestEntry?.latestStateHash ?? latestEntry?.probeHash ?? "—";
  const antigen = useMemo(
    () => (log?.entries ?? []).reduce((max, entry) => Math.max(max, classifyAntigen(entry)), 0),
    [log],
  );

  const heartbeatLabel = useMemo(() => {
    if (status === "live") return "SHADOW LIVE";
    if (status === "empty") return "NO SHADOW LOG";
    if (status === "error") return "SHADOW ERROR";
    return "LOADING";
  }, [status]);

  const refresh = useCallback(async () => {
    try {
      const [nextLog, nextStats, nextTelemetry] = await Promise.all([
        fetchJson<ShadowLogResponse>("/api/are-shadow/log?lines=160"),
        fetchJson<ShadowStatsResponse>("/api/are-shadow/stats?lines=400"),
        fetchJson<ShadowTelemetryResponse>("/api/are-shadow/telemetry"),
      ]);

      setLog(nextLog);
      setStats(nextStats);
      setTelemetry(nextTelemetry);
      setLastError(null);

      const hasEntries = (nextLog.entries?.length ?? 0) > 0 || Boolean(nextStats.latestEntry);
      setStatus(hasEntries ? "live" : "empty");

      const tick = numberOr(nextStats.latestEntry?.latestTick ?? nextStats.latestEntry?.tick ?? nextLog.entries?.[nextLog.entries.length - 1]?.tick, 0);
      const buffer = numberOr(nextStats.latestEntry?.size ?? nextLog.entries?.[nextLog.entries.length - 1]?.size, 0);
      const probeCount = (nextLog.entries ?? []).filter((entry) => entry.type === "ARE_SHADOW_PROBE").length;
      const antigenScore = (nextLog.entries ?? []).reduce((max, entry) => Math.max(max, classifyAntigen(entry)), 0);

      setPoints((prev) =>
        Object.freeze([
          ...prev.slice(-(MAX_POINTS - 1)),
          Object.freeze({ label: formatTick(tick), tick, buffer, antigen: antigenScore, probes: probeCount }),
        ]),
      );
    } catch (err) {
      setStatus("error");
      setLastError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!alive) return;
      await refresh();
    };
    void run();
    const timer = setInterval(() => void run(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [refresh]);

  return (
    <section className="bg-slate-900/90 border border-cyan-500/20 p-6 rounded-xl shadow-2xl shadow-cyan-950/20 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-mono uppercase tracking-[0.22em] mb-2">
            <ShieldCheck size={14} />
            ARE Shadow Control Plane
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Shadow Logs · Heartbeat · Antigen Monitor</h2>
          <p className="text-slate-400 text-sm mt-1">
            Side-channel telemetry only. It observes tests, probes and replay pressure without mutating gameplay truth.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 px-3 py-1 text-xs font-mono text-cyan-200">
          <span className={`h-2 w-2 rounded-full ${status === "live" ? "bg-emerald-400 animate-pulse" : status === "error" ? "bg-rose-400" : "bg-amber-300"}`} />
          {heartbeatLabel}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase"><HeartPulse size={14} /> Latest Tick</div>
          <div className="text-2xl font-bold mt-2">{latestTick || "—"}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase"><Radio size={14} /> Entries</div>
          <div className="text-2xl font-bold mt-2">{stats?.totalLogLines ?? log?.returnedLines ?? "—"}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase"><AlertTriangle size={14} /> Antigen Index</div>
          <div className="text-2xl font-bold mt-2">{antigen}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase"><FileText size={14} /> Shadow Probes</div>
          <div className="text-2xl font-bold mt-2">{probes.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={[...points]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={12} minTickGap={18} />
              <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "0.75rem" }} />
              <Legend />
              <Line type="monotone" dataKey="antigen" name="Antigen Index" stroke="#fb7185" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="buffer" name="Replay Buffer" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="probes" name="Probe Count" stroke="#a78bfa" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 overflow-hidden">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Activity size={16} className="text-emerald-400" /> Latest Shadow Events</h3>
          <div className="space-y-2 max-h-64 overflow-auto pr-2 text-xs font-mono">
            {lastError ? <div className="text-rose-300">{lastError}</div> : null}
            {(log?.entries ?? []).slice(-8).reverse().map((entry, index) => (
              <div key={`${entry.tick ?? index}-${entry.latestStateHash ?? entry.probeHash ?? index}`} className="rounded border border-slate-800 bg-slate-900/80 p-2">
                <div className="flex justify-between gap-3 text-slate-300">
                  <span>{entry.type ?? "TICK"}</span>
                  <span>{entry.tick ?? entry.latestTick ?? "—"}</span>
                </div>
                <div className="text-slate-500 truncate">hash: {String(entry.latestStateHash ?? entry.probeHash ?? "—")}</div>
                {entry.discrepancy ? <div className="text-amber-300 mt-1">{entry.discrepancy}</div> : null}
                {entry.recommendation ? <div className="text-cyan-300 mt-1">{entry.recommendation}</div> : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs text-slate-400">
        <pre className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 overflow-auto max-h-56">
{JSON.stringify({ latestHash, tickRange: stats?.tickRange ?? null, ecosystemEvents: stats?.ecosystemEvents ?? null }, null, 2)}
        </pre>
        <pre className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 overflow-auto max-h-56">
{JSON.stringify(telemetry?.telemetry ?? { available: false, message: telemetry?.message ?? "waiting" }, null, 2)}
        </pre>
      </div>
    </section>
  );
}

export default AREShadowPanel;
