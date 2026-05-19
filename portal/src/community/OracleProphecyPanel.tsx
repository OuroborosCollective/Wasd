import React, { useEffect, useMemo, useState } from "react";
import { pushAREEventTheme } from "@wasd/shared";

interface OracleProphecy {
  id?: string;
  active?: boolean;
  type?: string;
  kind?: string;
  sector?: string | number;
  sectorId?: string;
  severity?: number;
  confidence?: number;
  predictedInTicks?: number;
  message?: string;
  summary?: string;
  hash?: string;
  worldHash?: string;
  cause?: string;
}

interface OracleReportResponse {
  ok?: boolean;
  oracle?: {
    generatedAtTick?: number;
    worldHash?: string;
    recorderWindow?: number;
    prophecies?: OracleProphecy[];
    patterns?: Array<{ type?: string; kind?: string; count?: number; sector?: string | number; severity?: number }>;
  } | null;
}

function score(prophecy: OracleProphecy): number {
  const value = Number(prophecy.severity ?? prophecy.confidence ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

function label(prophecy: OracleProphecy): string {
  return prophecy.message ?? prophecy.summary ?? prophecy.type ?? prophecy.kind ?? "Unbenannte Prophezeiung";
}

function sector(prophecy: OracleProphecy): string {
  return String(prophecy.sectorId ?? prophecy.sector ?? "unknown");
}

function explain(prophecy: OracleProphecy, generatedAtTick?: number): string {
  const eta = typeof prophecy.predictedInTicks === "number" ? `ETA ${prophecy.predictedInTicks} ticks` : "ETA unknown";
  const sev = score(prophecy).toFixed(2);
  const base = prophecy.cause ?? prophecy.hash ?? prophecy.worldHash ?? "Recorder/WorldHash correlation";
  return `Emily liest ${base}. Tick ${generatedAtTick ?? "?"}. ${eta}. Severity ${sev}. Kein Raten, nur Musterfenster.`;
}

export const OracleProphecyPanel: React.FC = () => {
  const [data, setData] = useState<OracleReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(() => Date.now());

  async function refresh(): Promise<void> {
    try {
      const res = await fetch("/api/are/replay/oracle/prophecy", { cache: "no-store" });
      if (!res.ok) throw new Error(`oracle_http_${res.status}`);
      const next = (await res.json()) as OracleReportResponse;
      setData(next);
      setError(null);
      setLastRefresh(Date.now());
      const top = [...(next.oracle?.prophecies ?? [])]
        .filter((p) => p.active !== false)
        .sort((a, b) => score(b) - score(a))[0];
      if (top) {
        pushAREEventTheme({
          kind: "oracle",
          tick: next.oracle?.generatedAtTick,
          active: true,
          severity: score(top),
          hash: top.hash ?? top.worldHash,
          label: label(top),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const prophecies = useMemo(() => {
    return [...(data?.oracle?.prophecies ?? [])]
      .sort((a, b) => score(b) - score(a))
      .slice(0, 6);
  }, [data]);

  const activeCount = prophecies.filter((p) => p.active !== false).length;

  return (
    <section className="rounded-xl border border-amber-300/50 bg-amber-950/10 p-4 text-slate-100 shadow-[0_0_24px_rgba(255,230,109,0.14)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.25em] text-amber-200">ORACLE</h3>
          <p className="mt-1 max-w-2xl text-xs text-slate-300">
            Deterministische Prophezeiungen aus Recorder, WorldHash und ARE-Pattern-Analyzer.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded border border-amber-300/50 bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-400/25"
        >
          Refresh Oracle
        </button>
      </div>

      <div className="mb-3 grid gap-2 font-mono text-xs md:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-black/25 p-2">
          <div className="text-slate-500">generated_tick</div>
          <div className="text-amber-100">{data?.oracle?.generatedAtTick ?? "unknown"}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/25 p-2">
          <div className="text-slate-500">active</div>
          <div className="text-amber-100">{activeCount}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/25 p-2">
          <div className="text-slate-500">patterns</div>
          <div className="text-amber-100">{data?.oracle?.patterns?.length ?? 0}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/25 p-2">
          <div className="text-slate-500">refresh</div>
          <div className="text-amber-100">{new Date(lastRefresh).toLocaleTimeString()}</div>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-400/50 bg-red-950/30 p-2 text-xs text-red-100">
          Oracle API nicht erreichbar: {error}
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-2">
        {prophecies.length === 0 ? (
          <div className="rounded-xl border border-amber-200/25 bg-black/25 p-3 text-sm text-slate-300">
            Keine aktive Prophezeiung im Recorder-Fenster. Emily wartet auf Musterverdichtung.
          </div>
        ) : (
          prophecies.map((prophecy, index) => {
            const sev = score(prophecy);
            const active = prophecy.active !== false;
            return (
              <article key={prophecy.id ?? prophecy.hash ?? index} className="rounded-xl border border-amber-200/30 bg-black/30 p-3 shadow-[inset_0_0_18px_rgba(255,230,109,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-amber-100">{label(prophecy)}</h4>
                    <p className="mt-1 text-xs text-slate-400">Sektor {sector(prophecy)}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-widest ${active ? "border-amber-200/50 text-amber-100" : "border-slate-500/40 text-slate-400"}`}>
                    {active ? "active" : "dormant"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-300">
                  <div className="rounded bg-black/30 p-2">
                    <div className="text-slate-500">severity</div>
                    <div className={sev >= 0.8 ? "text-red-200" : "text-amber-200"}>{sev.toFixed(3)}</div>
                  </div>
                  <div className="rounded bg-black/30 p-2">
                    <div className="text-slate-500">eta_ticks</div>
                    <div>{prophecy.predictedInTicks ?? "unknown"}</div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-amber-50">{explain(prophecy, data?.oracle?.generatedAtTick)}</p>
                {(prophecy.hash || prophecy.worldHash) && (
                  <p className="mt-2 break-all font-mono text-[10px] text-slate-500">{String(prophecy.hash ?? prophecy.worldHash).slice(0, 48)}…</p>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};

export default OracleProphecyPanel;
