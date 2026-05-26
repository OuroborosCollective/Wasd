import React, { useState } from 'react';

type EpochId = 'awakening' | 'strife' | 'synthesis' | 'ascension';

const labels: Record<EpochId, string> = {
  awakening: 'Age of Awakening',
  strife: 'Age of Strife',
  synthesis: 'Age of Synthesis',
  ascension: 'Age of Ascension',
};

const heroes = [
  { peerId: 'thomas-architect', role: 'Architect', score: 1440 },
  { peerId: 'guardian-12-8', role: 'Guardian', score: 910 },
  { peerId: 'trader-circuit', role: 'Trader', score: 780 },
];

function nextEpoch(current: EpochId): EpochId {
  if (current === 'awakening') return 'strife';
  if (current === 'strife') return 'synthesis';
  if (current === 'synthesis') return 'ascension';
  return 'ascension';
}

function tinyHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function EpochChroniclePanel(): React.ReactElement {
  const [epoch, setEpoch] = useState<EpochId>('awakening');
  const [quests, setQuests] = useState(12);
  const [quorum, setQuorum] = useState(0.42);
  const next = nextEpoch(epoch);
  const ready = next !== epoch && quests >= 12 && quorum >= 0.42;
  const epochHash = tinyHash(`${epoch}|${next}|${quests}|${quorum}`);

  return (
    <section className="rounded-3xl border border-yellow-100/30 bg-white/[0.04] p-5 shadow-[0_0_34px_rgba(255,245,180,0.18)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-yellow-100/70">Emily · Chronistin</p>
          <h2 className="mt-1 text-xl font-black text-white">Sovereign Epochs</h2>
        </div>
        <button
          type="button"
          className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.2em] transition-all ${
            ready
              ? 'border-yellow-100/40 bg-yellow-100/10 text-yellow-50 shadow-[0_0_12px_rgba(254,240,138,0.2)] hover:bg-yellow-100/20'
              : 'cursor-not-allowed border-white/10 bg-white/5 text-white/30'
          }`}
          onClick={() => setEpoch(next)}
          disabled={!ready}
          aria-label={`Shift from ${labels[epoch]} to ${labels[next]}`}
          title={ready ? 'Shift to next epoch' : '12 quests and 0.42 quorum required'}
        >
          Epoch Shift
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label htmlFor="quests-range" className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
          Destiny Quests
          <input
            id="quests-range"
            className="mt-2 w-full accent-yellow-200"
            type="range"
            min={0}
            max={100}
            value={quests}
            onChange={(event) => setQuests(Number(event.target.value))}
          />
          <strong className="text-yellow-100">{quests}</strong>
        </label>
        <label htmlFor="quorum-range" className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
          Global Quorum
          <input
            id="quorum-range"
            className="mt-2 w-full accent-yellow-200"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={quorum}
            onChange={(event) => setQuorum(Number(event.target.value))}
          />
          <strong className="text-yellow-100">{quorum.toFixed(2)}</strong>
        </label>
        <div className="rounded-2xl border border-yellow-100/20 bg-yellow-100/5 p-3 font-mono text-xs text-yellow-50/80">
          <div>current {labels[epoch]}</div>
          <div>next {labels[next]}</div>
          <div>epochHash {epochHash}</div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-yellow-100/20 bg-yellow-100/10 p-4 text-sm text-yellow-50" aria-live="polite">
        {ready
          ? `Emily: ${labels[next]} begins. Sector states and global modifiers are ready for a deterministic reset.`
          : `Emily: ${labels[epoch]} remains stable. The Collective is still gathering destiny signals.`}
      </div>

      <div className="mt-4 grid gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/50">Archived Heroes</p>
        {heroes.map((hero) => (
          <div key={hero.peerId} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80">
            <span>{hero.peerId} · {hero.role}</span>
            <strong className="text-yellow-100">{hero.score}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export default EpochChroniclePanel;
