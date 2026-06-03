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
import { Activity, Zap, BarChart3, RefreshCw, AlertCircle } from "lucide-react";

interface WeightTrend {
  timestamp: string;
  weightA: number;
  weightB: number;
  weightC: number;
}

interface HeatmapPoint {
  hour: number;
  day: number;
  value: number;
}

interface Metrics {
  conversionRate: number;
  totalEvents: number;
  avgLatency: number;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected";

type StatsMessage =
  | {
      type: "WEIGHT_UPDATE";
      payload: {
        weightA: number;
        weightB: number;
        weightC: number;
        timestamp?: string;
      };
    }
  | {
      type: "HEATMAP_UPDATE";
      payload: HeatmapPoint[];
    }
  | {
      type: "METRICS_UPDATE";
      payload: Metrics;
    };

const MAX_WEIGHT_POINTS = 20;
const FALLBACK_INTERVAL_MS = 3000;
const RECONNECT_BASE_MS = 1200;
const RECONNECT_MAX_MS = 10000;

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const stableHash = (input: string): number => {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const deterministic01 = (seed: string): number => {
  const hash = stableHash(seed);
  return hash / 0xffffffff;
};

const deterministicRange = (seed: string, min: number, max: number): number => {
  return min + deterministic01(seed) * (max - min);
};

const deterministicInt = (seed: string, min: number, max: number): number => {
  return Math.floor(deterministicRange(seed, min, max + 1));
};

const formatTickLabel = (tick: number) => {
  return `T+${tick.toString().padStart(4, "0")}`;
};

const createFallbackHeatmap = (tick: number): HeatmapPoint[] => {
  const points: HeatmapPoint[] = [];

  for (let day = 0; day < 7; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const morningBoost = hour >= 8 && hour <= 11 ? 18 : 0;
      const eveningBoost = hour >= 18 && hour <= 22 ? 26 : 0;
      const weekendBoost = day >= 5 ? 12 : 0;
      const base = deterministicInt(`heat:${tick}:${day}:${hour}`, 4, 72);

      points.push({
        day,
        hour,
        value: clamp(base + morningBoost + eveningBoost + weekendBoost, 0, 100),
      });
    }
  }

  return points;
};

const createFallbackWeights = (tick: number): WeightTrend => {
  const waveA = 50 + Math.sin(tick * 0.47) * 22;
  const waveB = 48 + Math.cos(tick * 0.31) * 24;
  const waveC = 52 + Math.sin(tick * 0.19 + 1.2) * 20;

  return {
    timestamp: formatTickLabel(tick),
    weightA: clamp(waveA + deterministicRange(`weightA:${tick}`, -7, 7), 0, 100),
    weightB: clamp(waveB + deterministicRange(`weightB:${tick}`, -7, 7), 0, 100),
    weightC: clamp(waveC + deterministicRange(`weightC:${tick}`, -7, 7), 0, 100),
  };
};

const createFallbackMetrics = (tick: number): Metrics => {
  return {
    conversionRate: clamp(3.2 + Math.sin(tick * 0.21) * 0.8 + deterministicRange(`cr:${tick}`, -0.18, 0.18), 0, 100),
    totalEvents: 12450 + tick * 37 + deterministicInt(`events:${tick}`, 0, 25),
    avgLatency: clamp(45 + Math.cos(tick * 0.33) * 6 + deterministicRange(`lat:${tick}`, -2.5, 2.5), 1, 999),
  };
};

const resolveStatsWsUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_STATS_WS_URL;

  if (envUrl && envUrl.trim().length > 0) {
    return envUrl;
  }

  if (typeof window === "undefined") {
    return "ws://localhost:8080/stats";
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const hostname = window.location.hostname || "localhost";

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "ws://localhost:8080/stats";
  }

  return `${protocol}//${hostname}/stats`;
};

const isHeatmapPayload = (payload: unknown): payload is HeatmapPoint[] => {
  return (
    Array.isArray(payload) &&
    payload.every((point) => {
      if (!point || typeof point !== "object") return false;

      const candidate = point as HeatmapPoint;

      return (
        Number.isFinite(candidate.hour) &&
        Number.isFinite(candidate.day) &&
        Number.isFinite(candidate.value)
      );
    })
  );
};

const isMetricsPayload = (payload: unknown): payload is Metrics => {
  if (!payload || typeof payload !== "object") return false;

  const candidate = payload as Metrics;

  return (
    Number.isFinite(candidate.conversionRate) &&
    Number.isFinite(candidate.totalEvents) &&
    Number.isFinite(candidate.avgLatency)
  );
};

const isWeightPayload = (
  payload: unknown,
): payload is StatsMessage & { type: "WEIGHT_UPDATE" } extends infer T
  ? T extends { payload: infer P }
    ? P
    : never
  : never => {
  if (!payload || typeof payload !== "object") return false;

  const candidate = payload as {
    weightA: number;
    weightB: number;
    weightC: number;
  };

  return (
    Number.isFinite(candidate.weightA) &&
    Number.isFinite(candidate.weightB) &&
    Number.isFinite(candidate.weightC)
  );
};

const parseStatsMessage = (raw: string): StatsMessage | null => {
  try {
    const parsed = JSON.parse(raw) as {
      type?: unknown;
      payload?: unknown;
    };

    if (parsed.type === "WEIGHT_UPDATE" && isWeightPayload(parsed.payload)) {
      return {
        type: "WEIGHT_UPDATE",
        payload: parsed.payload,
      };
    }

    if (parsed.type === "HEATMAP_UPDATE" && isHeatmapPayload(parsed.payload)) {
      return {
        type: "HEATMAP_UPDATE",
        payload: parsed.payload.map((point) => ({
          hour: clamp(Math.trunc(point.hour), 0, 23),
          day: clamp(Math.trunc(point.day), 0, 6),
          value: clamp(point.value, 0, 100),
        })),
      };
    }

    if (parsed.type === "METRICS_UPDATE" && isMetricsPayload(parsed.payload)) {
      return {
        type: "METRICS_UPDATE",
        payload: {
          conversionRate: clamp(parsed.payload.conversionRate, 0, 100),
          totalEvents: Math.max(0, Math.trunc(parsed.payload.totalEvents)),
          avgLatency: Math.max(0, parsed.payload.avgLatency),
        },
      };
    }

    return null;
  } catch {
    return null;
  }
};

const Dashboard = () => {
  const [weights, setWeights] = useState<WeightTrend[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapPoint[]>(() => createFallbackHeatmap(0));
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [metrics, setMetrics] = useState<Metrics>({
    conversionRate: 0,
    totalEvents: 0,
    avgLatency: 0,
  });

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const fallbackTickRef = useRef(0);
  const isMountedRef = useRef(false);

  const wsUrl = useMemo(() => resolveStatsWsUrl(), []);

  const connectionLabel = useMemo(() => {
    if (status === "connected") return "CONNECTED";
    if (status === "connecting") return "CONNECTING";
    return "FALLBACK";
  }, [status]);

  const statusClassName = useMemo(() => {
    if (status === "connected") return "bg-emerald-500/10 text-emerald-400";
    if (status === "connecting") return "bg-blue-500/10 text-blue-400";
    return "bg-rose-500/10 text-rose-400";
  }, [status]);

  const dotClassName = useMemo(() => {
    if (status === "connected") return "bg-emerald-500 animate-pulse";
    if (status === "connecting") return "bg-blue-500 animate-pulse";
    return "bg-rose-500";
  }, [status]);

  const appendWeight = useCallback((next: WeightTrend) => {
    setWeights((prev) => [...prev.slice(-(MAX_WEIGHT_POINTS - 1)), next]);
  }, []);

  const applyMessage = useCallback(
    (message: StatsMessage) => {
      if (message.type === "WEIGHT_UPDATE") {
        appendWeight({
          timestamp: message.payload.timestamp ?? formatTickLabel(fallbackTickRef.current),
          weightA: clamp(message.payload.weightA, 0, 100),
          weightB: clamp(message.payload.weightB, 0, 100),
          weightC: clamp(message.payload.weightC, 0, 100),
        });

        return;
      }

      if (message.type === "HEATMAP_UPDATE") {
        setHeatmap(message.payload);
        return;
      }

      if (message.type === "METRICS_UPDATE") {
        setMetrics(message.payload);
      }
    },
    [appendWeight],
  );

  const runFallbackTick = useCallback(() => {
    fallbackTickRef.current += 1;

    const tick = fallbackTickRef.current;

    appendWeight(createFallbackWeights(tick));
    setHeatmap(createFallbackHeatmap(tick));
    setMetrics(createFallbackMetrics(tick));
  }, [appendWeight]);

  const startFallback = useCallback(() => {
    if (fallbackTimerRef.current) return;

    runFallbackTick();

    fallbackTimerRef.current = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) return;
      runFallbackTick();
    }, FALLBACK_INTERVAL_MS);
  }, [runFallbackTick]);

  const stopFallback = useCallback(() => {
    if (!fallbackTimerRef.current) return;

    clearInterval(fallbackTimerRef.current);
    fallbackTimerRef.current = null;
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (!reconnectTimerRef.current) return;

    clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
  }, []);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    clearReconnectTimer();

    const existingSocket = socketRef.current;

    if (
      existingSocket &&
      (existingSocket.readyState === WebSocket.OPEN ||
        existingSocket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    setStatus("connecting");

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptRef.current = 0;
      setStatus("connected");
      stopFallback();
    };

    socket.onmessage = (event) => {
      if (typeof event.data !== "string") return;

      const message = parseStatsMessage(event.data);

      if (message) {
        applyMessage(message);
      }
    };

    socket.onerror = () => {
      socket.close();
    };

    socket.onclose = () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      if (!isMountedRef.current) return;

      setStatus("disconnected");
      startFallback();

      reconnectAttemptRef.current += 1;

      const delay = Math.min(
        RECONNECT_MAX_MS,
        RECONNECT_BASE_MS * reconnectAttemptRef.current,
      );

      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [applyMessage, clearReconnectTimer, startFallback, stopFallback, wsUrl]);

  useEffect(() => {
    isMountedRef.current = true;

    connect();

    return () => {
      isMountedRef.current = false;

      clearReconnectTimer();
      stopFallback();

      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [clearReconnectTimer, connect, stopFallback]);

  const getColor = useCallback((value: number) => {
    const safeValue = clamp(value, 0, 100);
    const hue = (safeValue / 100) * 140;

    return `hsl(${hue}, 72%, 48%)`;
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Heuristic Analytics Engine
            </h1>
            <p className="text-slate-400 mt-1">
              Deterministic real-time optimization monitoring
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusClassName}`}
              title={wsUrl}
            >
              <div className={`w-2 h-2 rounded-full ${dotClassName}`} />
              {connectionLabel}
            </div>

            <p className="text-xs text-slate-500 break-all">
              Stream: {wsUrl}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl shadow-black/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                <BarChart3 size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-400">Conversion Rate</p>
                <p className="text-2xl font-bold">
                  {metrics.conversionRate.toFixed(2)}%
                </p>
              </div>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl shadow-black/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
                <Activity size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Events</p>
                <p className="text-2xl font-bold">
                  {metrics.totalEvents.toLocaleString()}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl shadow-black/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400">
                <Zap size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-400">Latency avg</p>
                <p className="text-2xl font-bold">
                  {metrics.avgLatency.toFixed(1)}ms
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl shadow-black/10">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <RefreshCw className="text-blue-400" size={20} />
              Optimization Trend
            </h2>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weights}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#64748b"
                    fontSize={12}
                    minTickGap={24}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: "0.75rem",
                    }}
                    itemStyle={{ fontSize: "12px" }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="weightA"
                    name="Weight A"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="weightB"
                    name="Weight B"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="weightC"
                    name="Weight C"
                    stroke="#eab308"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl shadow-black/10">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <AlertCircle className="text-emerald-400" size={20} />
              Conversion Heatmap Day/Hour
            </h2>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <XAxis
                    type="number"
                    dataKey="hour"
                    name="Hour"
                    domain={[0, 23]}
                    stroke="#64748b"
                    tickCount={12}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="number"
                    dataKey="day"
                    name="Day"
                    domain={[0, 6]}
                    stroke="#64748b"
                    allowDecimals={false}
                    tickFormatter={(value) => DAY_LABELS[value as keyof typeof DAY_LABELS] ?? ""}
                  />
                  <ZAxis type="number" dataKey="value" range={[70, 420]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: "0.75rem",
                    }}
                    formatter={(value, name) => {
                      if (name === "value") return [`${Number(value).toFixed(0)}%`, "Intensity"];
                      return [value, name];
                    }}
                    labelFormatter={(_, payload) => {
                      const point = payload?.[0]?.payload as HeatmapPoint | undefined;
                      if (!point) return "";

                      return `${DAY_LABELS[point.day] ?? "Day"} · ${point.hour}:00`;
                    }}
                  />
                  <Scatter
                    name="Conversion Intensity"
                    data={heatmap}
                    isAnimationActive={false}
                  >
                    {heatmap.map((entry) => (
                      <Cell
                        key={`cell-${entry.day}-${entry.hour}`}
                        fill={getColor(entry.value)}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
