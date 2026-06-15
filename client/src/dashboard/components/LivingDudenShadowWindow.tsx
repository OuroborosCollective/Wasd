import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LivingDudenTelemetry, ShadowStatus, SpeechEvent, WordFactorRanking } from './LivingDudenShadowWindow.types';

interface LivingDudenShadowWindowProps {
  readonly endpoint?: string;
}

const POLL_MS = 6000;

function emptyTelemetry(): LivingDudenTelemetry {
  return Object.freeze({
    ok: true,
    archive: Object.freeze({ totalLexemes: 0, inventedCount: 0, quarantinedCount: 0, promotedCount: 0, byLanguageCount: Object.freeze({}) }),
    speech: Object.freeze([]),
    wordFactorRankings: Object.freeze([]),
    termWatch: Object.freeze([]),
    structureRankings: Object.freeze([]),
    outcomeHistorySize: 0,
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function numberOr(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringOr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function numberRecord(value: unknown): Readonly<Record<string, number>> {
  const record = asRecord(value);
  if (!record) return Object.freeze({});
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(record)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) out[key] = raw;
  }
  return Object.freeze(out);
}

function pickTelemetry(payload: unknown): LivingDudenTelemetry {
  const root = asRecord(payload);
  const nested = asRecord(root?.telemetry) ?? root;
  const living = asRecord(nested?.livingDuden) ?? asRecord(nested?.livingDudenTelemetry) ?? asRecord(nested?.duden) ?? nested;
  if (!living) return emptyTelemetry();
  const archiveRecord = asRecord(living.archive) ?? {};
  return Object.freeze({
    ok: living.ok !== false,
    archive: Object.freeze({
      totalLexemes: numberOr(archiveRecord.totalLexemes),
      inventedCount: numberOr(archiveRecord.inventedCount),
      quarantinedCount: numberOr(archiveRecord.quarantinedCount),
      promotedCount: numberOr(archiveRecord.promotedCount),
      byLanguageCount: numberRecord(archiveRecord.byLanguageCount),
    }),
    speech: Object.freeze(Array.isArray(living.speech) ? living.speech as SpeechEvent[] : []),
    wordFactorRankings: Object.freeze(Array.isArray(living.wordFactorRankings) ? living.wordFactorRankings as WordFactorRanking[] : []),
    termWatch: Object.freeze(Array.isArray(living.termWatch) ? living.termWatch as LivingDudenTelemetry['termWatch'] : []),
    structureRankings: Object.freeze(Array.isArray(living.structureRankings) ? living.structureRankings as LivingDudenTelemetry['structureRankings'] : []),
    outcomeHistorySize: numberOr(living.outcomeHistorySize),
  });
}

function statusLabel(status: ShadowStatus): string {
  if (status === 'live') return 'DUDEN LIVE';
  if (status === 'empty') return 'WAITING';
  if (status === 'error') return 'DUDEN ERROR';
  return 'LOADING';
}

function statusDot(status: ShadowStatus): string {
  if (status === 'live') return 'bg-emerald-400 animate-pulse';
  if (status === 'error') return 'bg-rose-400';
  if (status === 'empty') return 'bg-amber-300';
  return 'bg-cyan-400 animate-pulse';
}

function MiniBar({ value, label }: { value: number; label: string }) {
  const width = Math.max(2, Math.min(100, Math.round(value * 100)));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-400"><span>{label}</span><span>{Math.round(value * 100)}%</span></div>
      <div className="h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-cyan-400" style={{ width: `${width}%` }} /></div>
    </div>
  );
}

export function LivingDudenShadowWindow({ endpoint = '/api/are-shadow/telemetry' }: LivingDudenShadowWindowProps) {
  const [status, setStatus] = useState<ShadowStatus>('loading');
  const [telemetry, setTelemetry] = useState<LivingDudenTelemetry>(() => emptyTelemetry());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(`${endpoint} -> ${response.status}`);
      const next = pickTelemetry(payload);
      setTelemetry(next);
      setError(null);
      setStatus(next.archive.totalLexemes > 0 || next.speech.length > 0 || next.wordFactorRankings.length > 0 ? 'live' : 'empty');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [endpoint]);

  useEffect(() => {
    let alive = true;
    const run = async () => { if (alive) await refresh(); };
    void run();
    const timer = window.setInterval(() => void run(), POLL_MS);
    return () => { alive = false; window.clearInterval(timer); };
  }, [refresh]);

  const latestSpeech = telemetry.speech.slice(-5).reverse();
  const topWords = useMemo(() => [...telemetry.wordFactorRankings].sort((a, b) => b.factor - a.factor).slice(0, 6), [telemetry.wordFactorRankings]);

  return (
    <section className="rounded-2xl border border-violet-500/20 bg-slate-900/90 p-4 shadow-2xl shadow-violet-950/20 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 text-xs font-mono uppercase tracking-[0.22em] text-violet-300">Living Duden Shadow Window</div>
          <h2 className="text-2xl font-black tracking-tight">Language Telemetry · Lexeme Pressure · Speech Drift</h2>
          <p className="mt-1 text-sm text-slate-400">Language side-channel imported from frontend/components and wired into the admin command center.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-violet-400/20 px-3 py-1 text-xs font-mono text-violet-200">
          <span className={`h-2 w-2 rounded-full ${statusDot(status)}`} />
          {statusLabel(status)}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-xs uppercase text-slate-400">Lexemes</div><div className="mt-2 text-2xl font-black">{telemetry.archive.totalLexemes}</div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-xs uppercase text-slate-400">Invented</div><div className="mt-2 text-2xl font-black">{telemetry.archive.inventedCount}</div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-xs uppercase text-slate-400">Quarantined</div><div className="mt-2 text-2xl font-black">{telemetry.archive.quarantinedCount}</div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-xs uppercase text-slate-400">Outcomes</div><div className="mt-2 text-2xl font-black">{telemetry.outcomeHistorySize}</div></div>
      </div>

      {error ? <div className="mt-4 rounded-xl border border-rose-400/40 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</div> : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="mb-3 font-bold">Latest Speech Events</h3>
          <div className="max-h-64 space-y-2 overflow-auto pr-2 text-xs">
            {latestSpeech.length === 0 ? <div className="text-slate-500">Waiting for first speech event.</div> : latestSpeech.map((event) => (
              <div key={event.eventHash} className="rounded border border-slate-800 bg-slate-900/80 p-2">
                <div className="flex justify-between gap-3 text-slate-300"><span>{event.npcId}</span><span>T{event.tick}</span></div>
                <div className="mt-1 text-slate-400">{stringOr(event.constructedText, '—')}</div>
                <div className="mt-1 truncate font-mono text-cyan-300">{event.speechHash}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="mb-3 font-bold">Top Word Factors</h3>
          <div className="space-y-3">
            {topWords.length === 0 ? <div className="text-sm text-slate-500">No word factors available.</div> : topWords.map((word) => (
              <MiniBar key={`${word.language}:${word.lemma}`} label={`${word.lemma} · ${word.language}`} value={word.factor} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default LivingDudenShadowWindow;
