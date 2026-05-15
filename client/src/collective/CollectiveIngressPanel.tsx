import React, { useEffect, useMemo, useState } from 'react';
import { fetchCollectiveIngressStatus, type CollectiveIngressStatus } from '../design/ThemeEngine';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function CollectiveIngressPanel() {
  const [status, setStatus] = useState<CollectiveIngressStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const next = await fetchCollectiveIngressStatus();
      if (!cancelled) setStatus(next);
    };
    run();
    const id = window.setInterval(run, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const bounds = useMemo(() => {
    const peers = status?.peers ?? [];
    if (peers.length === 0) return { minX: -16, maxX: 16, minY: -16, maxY: 16 };
    return peers.reduce((acc, peer) => ({
      minX: Math.min(acc.minX, peer.chunk.x),
      maxX: Math.max(acc.maxX, peer.chunk.x),
      minY: Math.min(acc.minY, peer.chunk.y),
      maxY: Math.max(acc.maxY, peer.chunk.y),
    }), { minX: peers[0].chunk.x - 4, maxX: peers[0].chunk.x + 4, minY: peers[0].chunk.y - 4, maxY: peers[0].chunk.y + 4 });
  }, [status]);

  const peers = status?.peers ?? [];
  const latestWelcome = status?.recentWelcomes?.at(-1);

  return <div className="collective-panel mt-6 rounded-3xl border p-4">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-fira text-xs uppercase tracking-[0.28em] text-cyan-100/70">Collective Ingress · Emily-Willkommens-Modus</p>
        <h3 className="text-lg font-black text-white">Sovereign Multiverse Live-Map</h3>
      </div>
      <span className="rounded-full border px-3 py-2 font-fira text-xs text-lime-100">{status?.peerCount ?? 0} peers · q {status?.queuedInputs ?? 0}</span>
    </div>
    {latestWelcome && <div className="collective-welcome mb-4 rounded-2xl border p-3 font-fira text-xs text-cyan-50">{latestWelcome.welcome} · Chunk {latestWelcome.chunk.x}:{latestWelcome.chunk.y}</div>}
    <div className="collective-map relative h-72 overflow-hidden rounded-3xl border">
      <div className="absolute inset-0 collective-map-grid" />
      {peers.map((peer) => {
        const xSpan = Math.max(1, bounds.maxX - bounds.minX);
        const ySpan = Math.max(1, bounds.maxY - bounds.minY);
        const left = clamp(((peer.chunk.x - bounds.minX) / xSpan) * 100, 5, 95);
        const top = clamp(((peer.chunk.y - bounds.minY) / ySpan) * 100, 5, 95);
        return <div key={peer.id} className="collective-peer-dot absolute" style={{ left: `${left}%`, top: `${top}%` }} title={`${peer.name} · ${peer.role} · ${peer.chunk.x}:${peer.chunk.y}`}>
          <span className="collective-peer-core" />
          <span className="collective-peer-label font-fira text-[10px]">{peer.role.slice(0, 3).toUpperCase()}</span>
        </div>;
      })}
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      {peers.slice(0, 6).map((peer) => <div key={peer.id} className="cyber-card">
        <p className="font-fira text-xs text-lime-100">{peer.name}</p>
        <p className="mt-1 font-fira text-[11px] text-cyan-100/70">{peer.role} · chunk {peer.chunk.x}:{peer.chunk.y}</p>
        <p className="mt-1 break-all font-fira text-[10px] text-cyan-100/45">{peer.publicKeyHash ?? 'legacy'}</p>
      </div>)}
    </div>
  </div>;
}
