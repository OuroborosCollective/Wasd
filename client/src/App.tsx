import React, { useEffect, useMemo, useState } from 'react';

type ScreenId = 'auth' | 'hub' | 'bridge' | 'hud' | 'assets';

interface AREPayload {
  l: number;
  k: number;
  r: number;
  kappaPosHash: string;
  resonance: number;
  sysLoad: number;
  resSync: number;
  bridgeStatus: 'stable' | 'mismatch' | 'scanning';
  threatLevel: number;
  tickHz: number;
}

const screens: Array<{ id: ScreenId; label: string; code: string }> = [
  { id: 'auth', label: 'AUTH ROOT', code: 'A0' },
  { id: 'hub', label: 'SCIENCE HUB', code: 'M1' },
  { id: 'bridge', label: 'CHAIN BRIDGE', code: 'B2' },
  { id: 'hud', label: 'GAME HUD', code: 'H3' },
  { id: 'assets', label: 'ASSET REPO', code: 'R4' },
];

const initialPayload: AREPayload = {
  l: 13,
  k: 1000,
  r: 0.618,
  kappaPosHash: '0xARE-13-03E8-OUROBOROS',
  resonance: 0.77,
  sysLoad: 0.42,
  resSync: 0.96,
  bridgeStatus: 'scanning',
  threatLevel: 0.31,
  tickHz: 10,
};

function useDeterministicPulse(frequency = 10, phase = 0) {
  const [time, setTime] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const seconds = (now - start) / 1000;
      setTime(seconds);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  return Math.sin(time * frequency * Math.PI * 2 + phase);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function pulseStyle(value: number, color = '0,229,255') {
  const intensity = 0.44 + value * 0.28;
  return {
    opacity: intensity,
    boxShadow: `0 0 ${14 + value * 26}px rgba(${color}, ${0.18 + value * 0.38})`,
  } satisfies React.CSSProperties;
}

function cyberBackground(screen: ScreenId) {
  const palettes: Record<ScreenId, string> = {
    auth: 'radial-gradient(circle at 50% 35%, rgba(0,229,255,.24), transparent 32%), radial-gradient(circle at 65% 62%, rgba(57,255,20,.14), transparent 26%), radial-gradient(circle at 20% 78%, rgba(255,122,0,.14), transparent 24%)',
    hub: 'radial-gradient(circle at 75% 20%, rgba(0,229,255,.28), transparent 28%), radial-gradient(circle at 20% 35%, rgba(57,255,20,.13), transparent 30%), linear-gradient(135deg, rgba(0,229,255,.08), transparent 48%, rgba(57,255,20,.07))',
    bridge: 'linear-gradient(90deg, rgba(0,229,255,.18), transparent 32%, rgba(230,0,0,.15)), radial-gradient(circle at 50% 50%, rgba(0,229,255,.16), transparent 28%)',
    hud: 'radial-gradient(circle at 50% 45%, rgba(0,229,255,.30), transparent 22%), radial-gradient(circle at 50% 45%, rgba(57,255,20,.16), transparent 44%)',
    assets: 'radial-gradient(circle at 28% 28%, rgba(0,229,255,.24), transparent 28%), radial-gradient(circle at 78% 62%, rgba(57,255,20,.14), transparent 28%), linear-gradient(160deg, rgba(255,122,0,.08), transparent 48%)',
  };
  return palettes[screen];
}

function Panel({ children, className = '', glow = 'blue' }: { children: React.ReactNode; className?: string; glow?: 'blue' | 'green' | 'fire' }) {
  return (
    <section className={`cyber-panel ${glow === 'green' ? 'cyber-panel-green' : glow === 'fire' ? 'cyber-panel-fire' : ''} ${className}`}>
      {children}
    </section>
  );
}

function Sparkline({ phase = 0, danger = false }: { phase?: number; danger?: boolean }) {
  const points = Array.from({ length: 36 }, (_, i) => {
    const x = i * 8;
    const y = 26 + Math.sin(i * 0.52 + phase) * 10 + Math.sin(i * 0.19 + phase * 0.7) * 5;
    return `${x},${y.toFixed(2)}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 280 56" className="h-14 w-full overflow-visible" role="img" aria-label="10 Hz deterministic sparkline">
      <polyline points={points} fill="none" stroke={danger ? '#FF7A00' : '#39FF14'} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(57,255,20,.7)]" />
    </svg>
  );
}

function AuthRoot({ payload, pulse, onPayload }: { payload: AREPayload; pulse: number; onPayload: (next: AREPayload) => void }) {
  const [value, setValue] = useState(payload.kappaPosHash);
  const [status, setStatus] = useState<'idle' | 'accepted' | 'denied'>('idle');

  const submit = () => {
    const ok = /^0x[A-Z0-9-]{8,}$/i.test(value.trim());
    setStatus(ok ? 'accepted' : 'denied');
    onPayload({
      ...payload,
      kappaPosHash: value.trim(),
      resonance: ok ? 0.96 : 0.18,
      bridgeStatus: ok ? 'stable' : 'mismatch',
    });
  };

  return (
    <div className="flex min-h-[72vh] items-center justify-center p-6">
      <Panel className={`w-full max-w-xl p-7 ${status === 'denied' ? 'organic-fire-shake' : ''}`} glow={status === 'denied' ? 'fire' : 'blue'}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.42em] text-cyan-200/70">Deterministic Gateway</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">AUTH_ROOT</h1>
          </div>
          <div className="rounded-full border border-cyan-300/40 px-3 py-1 font-fira text-xs text-cyan-100" style={pulseStyle(clamp01((pulse + 1) / 2))}>10.00 Hz</div>
        </div>
        <label className="mb-2 block text-xs uppercase tracking-[0.28em] text-cyan-100/70">kappaPos-Hash</label>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="cyber-input w-full"
          placeholder="0xARE-13-03E8-OUROBOROS"
          spellCheck={false}
        />
        <button type="button" onClick={submit} className="neon-button mt-5 w-full">Initialize Root</button>
        {status === 'accepted' && <div className="scanline mt-5 rounded-xl border border-lime-300/40 p-3 text-sm text-lime-200">Neon Green scanline accepted · AREPayload synchronized</div>}
        {status === 'denied' && <div className="mt-5 rounded-xl border border-red-500/40 bg-red-950/30 p-3 text-sm text-orange-200">Organic Fire denial · invalid hex string</div>}
      </Panel>
    </div>
  );
}

function ScienceHub({ payload, pulse }: { payload: AREPayload; pulse: number }) {
  const resonance = clamp01(payload.resonance + pulse * 0.05);
  return (
    <div className="grid min-h-[72vh] gap-5 p-5 lg:grid-cols-[80px_1fr]">
      <aside className="cyber-panel flex items-center justify-around gap-3 p-3 lg:flex-col">
        {screens.map((item) => <div key={item.id} className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-300/5 font-fira text-xs text-cyan-100">{item.code}</div>)}
      </aside>
      <main className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.42em] text-cyan-100/60">Science Portal Hub</p>
              <h2 className="mt-2 text-4xl font-black text-white">THE MATRIX</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 font-fira text-xs">
              <span className="rounded-xl border border-cyan-300/30 px-3 py-2 text-cyan-100">SYS_LOAD {(payload.sysLoad * 100).toFixed(1)}%</span>
              <span className="rounded-xl border border-lime-300/30 px-3 py-2 text-lime-100">RES_SYNC {(payload.resSync * 100).toFixed(1)}%</span>
            </div>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="cyber-card" style={pulseStyle(resonance, '0,229,255')}>
              <p className="font-fira text-xs text-cyan-200/70">ARE-Trader</p>
              <h3 className="mt-2 text-xl font-bold text-white">Liquidity Spiral</h3>
              <Sparkline phase={pulse * 2} />
            </div>
            <div className="cyber-card" style={pulseStyle(resonance, '57,255,20')}>
              <p className="font-fira text-xs text-lime-200/70">Health-Decay</p>
              <h3 className="mt-2 text-xl font-bold text-white">Entropy Forecast</h3>
              <Sparkline phase={pulse * 4} danger={payload.threatLevel > 0.66} />
            </div>
          </div>
        </Panel>
        <Panel className="p-5" glow="green">
          <p className="text-xs uppercase tracking-[0.42em] text-lime-100/60">AREPayload</p>
          <div className="mt-5 space-y-3 font-fira text-sm text-lime-100">
            <p>l = {payload.l}</p>
            <p>k = {payload.k}</p>
            <p>r = {payload.r.toFixed(3)}</p>
            <p>resonance = {resonance.toFixed(3)}</p>
            <p>tick = {payload.tickHz}.00Hz</p>
          </div>
        </Panel>
      </main>
    </div>
  );
}

function ChainBridge({ payload, pulse }: { payload: AREPayload; pulse: number }) {
  const source = ['A9F3', '13E8', 'C0DE', '39FF', '14AA', '00E5', 'FF7A', '0A0A'];
  const target = ['A9F3', '13E8', 'C0DE', '39F1', '14AA', '00E5', 'E600', '0A0A'];
  return (
    <div className="grid min-h-[72vh] gap-5 p-5 xl:grid-cols-[1fr_360px]">
      <Panel className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.42em] text-cyan-100/60">Security Bridge</p>
            <h2 className="mt-2 text-3xl font-black text-white">CHAIN-STRING VALIDATOR</h2>
          </div>
          <span className="rounded-full border border-cyan-300/40 px-4 py-2 font-fira text-xs text-cyan-100" style={pulseStyle((pulse + 1) / 2)}>Bridge {payload.bridgeStatus}</span>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[source, target].map((dump, dumpIndex) => (
            <div key={dumpIndex} className="cyber-card min-h-72">
              <p className="mb-4 font-fira text-xs uppercase tracking-[0.28em] text-cyan-100/60">{dumpIndex === 0 ? 'Source Hash' : 'Target Hash'}</p>
              <div className="grid grid-cols-2 gap-2 font-fira text-sm">
                {dump.map((segment, index) => {
                  const mismatch = source[index] !== target[index];
                  return <span key={`${segment}-${index}`} className={`rounded-lg border px-3 py-2 ${mismatch ? 'border-red-500/60 bg-red-950/40 text-orange-200 organic-fire' : 'border-cyan-300/20 bg-cyan-300/5 text-cyan-100'}`}>{segment}</span>;
                })}
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="p-5" glow="fire">
        <p className="text-xs uppercase tracking-[0.42em] text-orange-100/70">Terminal</p>
        <pre className="mt-5 whitespace-pre-wrap font-fira text-xs leading-6 text-orange-100/90">{`> bridge.scan --mode deterministic\n> source checksum: OK\n> target checksum: FIRE_DRIFT\n> mismatch @ segment[3], segment[6]\n> recommendation: quarantine bridge edge\n> AREPayload.kappa = ${payload.k}`}</pre>
      </Panel>
    </div>
  );
}

function GameHud({ payload, pulse }: { payload: AREPayload; pulse: number }) {
  return (
    <div className="relative min-h-[72vh] overflow-hidden p-5">
      <div className="absolute inset-0 grid place-items-center">
        <div className="h-72 w-72 rounded-full border border-cyan-300/20" style={pulseStyle((pulse + 1) / 2)} />
        <div className="absolute h-1 w-64 bg-cyan-300/50" />
        <div className="absolute h-64 w-1 bg-cyan-300/50" />
      </div>
      <div className="relative z-10 flex min-h-[72vh] flex-col justify-between">
        <div className="mx-auto rounded-full border border-lime-300/40 bg-black/50 px-5 py-2 font-fira text-xs text-lime-100">SYNC LCK {payload.tickHz}.00 Hz</div>
        <div className="grid gap-5 md:grid-cols-2">
          <Panel className="p-5" glow="blue">
            <p className="text-xs uppercase tracking-[0.42em] text-cyan-100/60">Threat Radar</p>
            <div className="mt-4 aspect-square max-h-64 rounded-full border border-cyan-300/30 bg-[radial-gradient(circle,rgba(0,229,255,.16),transparent_60%)]" />
          </Panel>
          <Panel className="p-5" glow="green">
            <p className="text-xs uppercase tracking-[0.42em] text-lime-100/60">Combo Validator</p>
            <div className="mt-5 grid grid-cols-4 gap-3">
              {['F', 'E', 'Q', 'R', '1', '2', '3', '4'].map((key, index) => <span key={key} className="grid h-12 place-items-center rounded-xl border border-lime-300/40 bg-lime-300/10 font-fira text-lime-100" style={pulseStyle(clamp01((Math.sin(index + pulse) + 1) / 2), '57,255,20')}>{key}</span>)}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function AssetRepository({ pulse }: { pulse: number }) {
  const assets = ['ouroboros_gate.glb', 'matrix_terminal.glb', 'wireframe_snake.glb', 'organic_fire_shader.mat'];
  return (
    <div className="grid min-h-[72vh] gap-5 p-5 xl:grid-cols-[1fr_380px]">
      <Panel className="p-5">
        <p className="text-xs uppercase tracking-[0.42em] text-cyan-100/60">Global Asset Repository</p>
        <h2 className="mt-2 text-3xl font-black text-white">3D MODEL VIEWER</h2>
        <div className="mt-6 grid min-h-96 place-items-center rounded-3xl border border-cyan-300/20 bg-[radial-gradient(circle,rgba(0,229,255,.18),transparent_38%),linear-gradient(135deg,rgba(57,255,20,.08),transparent)]">
          <div className="h-44 w-44 rotate-45 rounded-3xl border border-cyan-300/60" style={pulseStyle((pulse + 1) / 2)} />
        </div>
      </Panel>
      <Panel className="p-5" glow="green">
        <p className="text-xs uppercase tracking-[0.42em] text-lime-100/60">Metadata</p>
        <div className="mt-5 space-y-3">
          {assets.map((asset, index) => <div key={asset} className="cyber-card"><p className="font-fira text-sm text-lime-100">{asset}</p><p className="mt-1 text-xs text-cyan-100/60">checksum ARE-{index + 13}-{Math.round(1000 + index * 37)}</p></div>)}
        </div>
      </Panel>
    </div>
  );
}

const App: React.FC = () => {
  const [active, setActive] = useState<ScreenId>('auth');
  const [payload, setPayload] = useState<AREPayload>(initialPayload);
  const pulse = useDeterministicPulse(payload.tickHz, payload.l * 0.13);

  const background = useMemo(() => cyberBackground(active), [active]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPayload((current) => ({
        ...current,
        sysLoad: clamp01(0.44 + Math.sin(Date.now() / 1300) * 0.12),
        resSync: clamp01(0.91 + Math.sin(Date.now() / 900) * 0.04),
        threatLevel: clamp01(0.31 + Math.sin(Date.now() / 1700) * 0.2),
      }));
    }, 100);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="cyber-root min-h-screen text-slate-100">
      <div className="cyber-bg" style={{ backgroundImage: background }} />
      <div className="cyber-grid" />
      <header className="relative z-10 border-b border-cyan-300/10 bg-black/50 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-cyan-100/60">Ouroboros Collective</p>
            <h1 className="text-2xl font-black text-white">CYBER-ZEN AAAA+ PORTAL</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            {screens.map((screen) => (
              <button key={screen.id} type="button" onClick={() => setActive(screen.id)} className={`rounded-full border px-4 py-2 font-fira text-xs transition ${active === screen.id ? 'border-lime-300 bg-lime-300/10 text-lime-100 shadow-[0_0_18px_rgba(57,255,20,.35)]' : 'border-cyan-300/20 bg-cyan-300/5 text-cyan-100/70 hover:border-cyan-200/60'}`}>{screen.label}</button>
            ))}
          </nav>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-7xl">
        {active === 'auth' && <AuthRoot payload={payload} pulse={pulse} onPayload={setPayload} />}
        {active === 'hub' && <ScienceHub payload={payload} pulse={pulse} />}
        {active === 'bridge' && <ChainBridge payload={payload} pulse={pulse} />}
        {active === 'hud' && <GameHud payload={payload} pulse={pulse} />}
        {active === 'assets' && <AssetRepository pulse={pulse} />}
      </main>
    </div>
  );
};

export default App;
