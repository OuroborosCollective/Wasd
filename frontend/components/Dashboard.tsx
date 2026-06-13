"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from "recharts";
import {
  Activity,
  Zap,
  BarChart3,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { AREShadowPanel } from "./AREShadowPanel";

interface WeightTrend { readonly timestamp: string; readonly weightA: number; readonly weightB: number; readonly weightC: number }
interface HeatmapPoint { readonly hour: number; readonly day: number; readonly value: number }
interface Metrics { readonly conversionRate: number; readonly totalEvents: number; readonly avgLatency: number }
interface WeightUpdatePayload { readonly weightA: number; readonly weightB: number; readonly weightC: number; readonly timestamp?: string }

type ConnectionStatus = "connecting" | "connected" | "fallback";
type StatsMessage =
  | { readonly type: "WEIGHT_UPDATE"; readonly payload: WeightUpdatePayload }
  | { readonly type: "HEATMAP_UPDATE"; readonly payload: readonly HeatmapPoint[] }
  | { readonly type: "METRICS_UPDATE"; readonly payload: Metrics };

const MAX_WEIGHT_POINTS = 20;
const FALLBACK_INTERVAL_MS = 3000;
const RECONNECT_BASE_MS = 1200;
const RECONNECT_MAX_MS = 10_000;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const DEFAULT_METRICS: Metrics = Object.freeze({ conversionRate: 0, totalEvents: 0, avgLatency: 0 });

function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
function safeNumber(value: unknown, fallback = 0): number { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }
function stableHash(input: string): number { let hash = 2166136261; for (let i = 0; i < input.length; i += 1) { hash ^= input.charCodeAt(i); hash = Math.imul(hash, 16777619); } return hash >>> 0; }
function deterministic01(seed: string): number { return stableHash(seed) / 0xffffffff; }
function deterministicRange(seed: string, min: number, max: number): number { return min + deterministic01(seed) * (max - min); }
function deterministicInt(seed: string, min: number, max: number): number { return Math.floor(deterministicRange(seed, min, max + 1)); }
function formatTickLabel(tick: number): string { return `T+${tick.toString().padStart(4, "0")}`; }
function getDayLabel(value: unknown): string { return DAY_LABELS[Math.trunc(safeNumber(value, -1))] ?? ""; }

function createFallbackHeatmap(tick: number): readonly HeatmapPoint[] {
  const points: HeatmapPoint[] = [];
  for (let day = 0; day < 7; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const morningBoost = hour >= 8 && hour <= 11 ? 18 : 0;
      const eveningBoost = hour >= 18 && hour <= 22 ? 26 : 0;
      const weekendBoost = day >= 5 ? 12 : 0;
      const base = deterministicInt(`heat:${tick}:${day}:${hour}`, 4, 72);
      points.push(Object.freeze({ day, hour, value: clamp(base + morningBoost + eveningBoost + weekendBoost, 0, 100) }));
    }
  }
  return Object.freeze(points);
}

function createFallbackWeights(tick: number): WeightTrend {
  return Object.freeze({
    timestamp: formatTickLabel(tick),
    weightA: clamp(50 + Math.sin(tick * 0.47) * 22 + deterministicRange(`weightA:${tick}`, -7, 7), 0, 100),
    weightB: clamp(48 + Math.cos(tick * 0.31) * 24 + deterministicRange(`weightB:${tick}`, -7, 7), 0, 100),
    weightC: clamp(52 + Math.sin(tick * 0.19 + 1.2) * 20 + deterministicRange(`weightC:${tick}`, -7, 7), 0, 100),
  });
}

function createFallbackMetrics(tick: number): Metrics {
  return Object.freeze({
    conversionRate: clamp(3.2 + Math.sin(tick * 0.21) * 0.8 + deterministicRange(`cr:${tick}`, -0.18, 0.18), 0, 100),
    totalEvents: 12_450 + tick * 37 + deterministicInt(`events:${tick}`, 0, 25),
    avgLatency: clamp(45 + Math.cos(tick * 0.33) * 6 + deterministicRange(`lat:${tick}`, -2.5, 2.5), 1, 999),
  });
}

function resolveStatsWsUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_STATS_WS_URL;
  if (typeof envUrl === "string" && envUrl.trim()) return envUrl.trim();
  if (typeof window === "undefined") return "ws://localhost:8080/stats";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname || "localhost";
  const port = window.location.port ? `:${window.location.port}` : "";
  if (host === "localhost" || host === "127.0.0.1") return "ws://localhost:8080/stats";
  return `${protocol}//${host}${port}/stats`;
}

function isWeightPayload(payload: unknown): payload is WeightUpdatePayload {
  const c = payload as Partial<WeightUpdatePayload> | null;
  return Boolean(c && typeof c === "object" && Number.isFinite(c.weightA) && Number.isFinite(c.weightB) && Number.isFinite(c.weightC) && (c.timestamp === undefined || typeof c.timestamp === "string"));
}
function isHeatmapPayload(payload: unknown): payload is readonly HeatmapPoint[] {
  return Array.isArray(payload) && payload.every((p) => p && typeof p === "object" && Number.isFinite((p as HeatmapPoint).hour) && Number.isFinite((p as HeatmapPoint).day) && Number.isFinite((p as HeatmapPoint).value));
}
function isMetricsPayload(payload: unknown): payload is Metrics {
  const c = payload as Partial<Metrics> | null;
  return Boolean(c && typeof c === "object" && Number.isFinite(c.conversionRate) && Number.isFinite(c.totalEvents) && Number.isFinite(c.avgLatency));
}
function normalizeHeatmap(payload: readonly HeatmapPoint[]): readonly HeatmapPoint[] { return Object.freeze(payload.map((p) => Object.freeze({ hour: clamp(Math.trunc(p.hour), 0, 23), day: clamp(Math.trunc(p.day), 0, 6), value: clamp(p.value, 0, 100) }))); }
function normalizeMetrics(payload: Metrics): Metrics { return Object.freeze({ conversionRate: clamp(payload.conversionRate, 0, 100), totalEvents: Math.max(0, Math.trunc(payload.totalEvents)), avgLatency: Math.max(0, payload.avgLatency) }); }

function parseStatsMessage(raw: string): StatsMessage | null {
  try {
    const parsed = JSON.parse(raw) as { readonly type?: unknown; readonly payload?: unknown };
    if (parsed.type === "WEIGHT_UPDATE" && isWeightPayload(parsed.payload)) return Object.freeze({ type: "WEIGHT_UPDATE", payload: Object.freeze({ weightA: parsed.payload.weightA, weightB: parsed.payload.weightB, weightC: parsed.payload.weightC, timestamp: parsed.payload.timestamp }) });
    if (parsed.type === "HEATMAP_UPDATE" && isHeatmapPayload(parsed.payload)) return Object.freeze({ type: "HEATMAP_UPDATE", payload: normalizeHeatmap(parsed.payload) });
    if (parsed.type === "METRICS_UPDATE" && isMetricsPayload(parsed.payload)) return Object.freeze({ type: "METRICS_UPDATE", payload: normalizeMetrics(parsed.payload) });
    return null;
  } catch { return null; }
}

function getCellColor(value: number): string { return `hsl(${Math.trunc((clamp(value, 0, 100) / 100) * 140)}, 72%, 48%)`; }

export default function Dashboard() {
  const [weights, setWeights] = useState<readonly WeightTrend[]>([]);
  const [heatmap, setHeatmap] = useState<readonly HeatmapPoint[]>(() => createFallbackHeatmap(0));
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [metrics, setMetrics] = useState<Metrics>(DEFAULT_METRICS);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const fallbackTickRef = useRef(0);
  const mountedRef = useRef(false);
  const wsUrl = useMemo(() => resolveStatsWsUrl(), []);

  const connectionLabel = status === "connected" ? "CONNECTED" : status === "connecting" ? "CONNECTING" : "DETERMINISTIC FALLBACK";
  const statusClassName = status === "connected" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : status === "connecting" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-amber-500/10 text-amber-300 border-amber-500/20";
  const dotClassName = status === "connected" ? "bg-emerald-500 animate-pulse" : status === "connecting" ? "bg-cyan-500 animate-pulse" : "bg-amber-400";

  const appendWeight = useCallback((next: WeightTrend) => setWeights((prev) => Object.freeze([...prev.slice(-(MAX_WEIGHT_POINTS - 1)), next])), []);
  const runFallbackTick = useCallback(() => { fallbackTickRef.current += 1; const tick = fallbackTickRef.current; appendWeight(createFallbackWeights(tick)); setHeatmap(createFallbackHeatmap(tick)); setMetrics(createFallbackMetrics(tick)); }, [appendWeight]);
  const stopFallback = useCallback(() => { if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current); fallbackTimerRef.current = null; }, []);
  const startFallback = useCallback(() => { if (fallbackTimerRef.current) return; runFallbackTick(); fallbackTimerRef.current = setInterval(() => { if (socketRef.current?.readyState === WebSocket.OPEN) return; runFallbackTick(); }, FALLBACK_INTERVAL_MS); }, [runFallbackTick]);
  const clearReconnectTimer = useCallback(() => { if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }, []);
  const closeSocket = useCallback(() => { const socket = socketRef.current; socketRef.current = null; if (!socket) return; socket.onopen = null; socket.onmessage = null; socket.onerror = null; socket.onclose = null; if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) socket.close(); }, []);

  const applyMessage = useCallback((message: StatsMessage) => {
    if (message.type === "WEIGHT_UPDATE") { appendWeight(Object.freeze({ timestamp: message.payload.timestamp ?? formatTickLabel(fallbackTickRef.current), weightA: clamp(message.payload.weightA, 0, 100), weightB: clamp(message.payload.weightB, 0, 100), weightC: clamp(message.payload.weightC, 0, 100) })); return; }
    if (message.type === "HEATMAP_UPDATE") { setHeatmap(message.payload); return; }
    setMetrics(message.payload);
  }, [appendWeight]);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    clearReconnectTimer();
    const existing = socketRef.current;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) return;
    setStatus("connecting");
    let socket: WebSocket;
    try { socket = new WebSocket(wsUrl); } catch { setStatus("fallback"); startFallback(); return; }
    socketRef.current = socket;
    socket.onopen = () => { reconnectAttemptRef.current = 0; setStatus("connected"); stopFallback(); };
    socket.onmessage = (event) => { if (typeof event.data !== "string") return; const message = parseStatsMessage(event.data); if (message) applyMessage(message); };
    socket.onerror = () => socket.close();
    socket.onclose = () => { if (socketRef.current === socket) socketRef.current = null; if (!mountedRef.current) return; setStatus("fallback"); startFallback(); reconnectAttemptRef.current += 1; const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * reconnectAttemptRef.current); reconnectTimerRef.current = setTimeout(() => connect(), delay); };
  }, [applyMessage, clearReconnectTimer, startFallback, stopFallback, wsUrl]);

  useEffect(() => { mountedRef.current = true; connect(); return () => { mountedRef.current = false; clearReconnectTimer(); stopFallback(); closeSocket(); }; }, [clearReconnectTimer, closeSocket, connect, stopFallback]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center border-b border-cyan-500/20 pb-6">
          <div>
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-mono uppercase tracking-[0.22em] mb-2"><ShieldCheck size={14} /> ARE Telemetry Side Channel</div>
            <h1 className="text-3xl font-bold tracking-tight">Heuristic Analytics Engine</h1>
            <p className="text-slate-400 mt-1">Deterministic monitoring surface — not authoritative gameplay truth</p>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${statusClassName}`} title={wsUrl}><div className={`w-2 h-2 rounded-full ${dotClassName}`} />{connectionLabel}</div>
            <p className="text-xs text-slate-500 break-all">Stream: {wsUrl}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <section className="bg-slate-900/90 border border-slate-800 p-6 rounded-xl"><div className="flex items-center gap-4"><div className="p-3 bg-cyan-500/10 rounded-lg text-cyan-400"><BarChart3 size={24} /></div><div><p className="text-sm text-slate-400">Conversion Rate</p><p className="text-2xl font-bold">{metrics.conversionRate.toFixed(2)}%</p></div></div></section>
          <section className="bg-slate-900/90 border border-slate-800 p-6 rounded-xl"><div className="flex items-center gap-4"><div className="p-3 bg-violet-500/10 rounded-lg text-violet-400"><Activity size={24} /></div><div><p className="text-sm text-slate-400">Total Events</p><p className="text-2xl font-bold">{metrics.totalEvents.toLocaleString()}</p></div></div></section>
          <section className="bg-slate-900/90 border border-slate-800 p-6 rounded-xl"><div className="flex items-center gap-4"><div className="p-3 bg-amber-500/10 rounded-lg text-amber-400"><Zap size={24} /></div><div><p className="text-sm text-slate-400">Latency Avg</p><p className="text-2xl font-bold">{metrics.avgLatency.toFixed(1)}ms</p></div></div></section>
        </div>

        <AREShadowPanel />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="bg-slate-900/90 border border-slate-800 p-6 rounded-xl shadow-2xl shadow-black/10">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><RefreshCw className="text-cyan-400" size={20} /> Optimization Trend</h2>
            <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={[...weights]}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" /><XAxis dataKey="timestamp" stroke="#64748b" fontSize={12} minTickGap={24} /><YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} /><Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "0.75rem" }} itemStyle={{ fontSize: "12px" }} labelStyle={{ color: "#e2e8f0" }} /><Legend /><Line type="monotone" dataKey="weightA" name="Weight A" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} /><Line type="monotone" dataKey="weightB" name="Weight B" stroke="#a855f7" strokeWidth={2} dot={false} isAnimationActive={false} /><Line type="monotone" dataKey="weightC" name="Weight C" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
          </section>
          <section className="bg-slate-900/90 border border-slate-800 p-6 rounded-xl shadow-2xl shadow-black/10">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><AlertCircle className="text-emerald-400" size={20} /> Conversion Heatmap Day/Hour</h2>
            <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}><XAxis type="number" dataKey="hour" name="Hour" domain={[0, 23]} stroke="#64748b" tickCount={12} allowDecimals={false} /><YAxis type="number" dataKey="day" name="Day" domain={[0, 6]} stroke="#64748b" allowDecimals={false} tickFormatter={getDayLabel} /><ZAxis type="number" dataKey="value" range={[70, 420]} /><Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "0.75rem" }} formatter={(value, name) => name === "value" ? [`${Number(value).toFixed(0)}%`, "Intensity"] : [value, name]} labelFormatter={(_, payload) => { const point = payload?.[0]?.payload as HeatmapPoint | undefined; return point ? `${DAY_LABELS[point.day] ?? "Day"} · ${point.hour}:00` : ""; }} /><Scatter name="Conversion Intensity" data={[...heatmap]} isAnimationActive={false}>{heatmap.map((entry) => <Cell key={`cell-${entry.day}-${entry.hour}`} fill={getCellColor(entry.value)} />)}</Scatter></ScatterChart></ResponsiveContainer></div>
          </section>
        </div>
      </div>
    </div>
  );
}
