import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Activity, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TimingData {
  timestamp: number;
  delta: number;
  jitter: number;
}

const HISTORY_LIMIT = 100;
const EXPECTED_TICK_MS = 16.666; // 60Hz Target

export const TimingMonitor: React.FC = () => {
  const [history, setHistory] = useState<TimingData[]>([]);
  const [metrics, setMetrics] = useState({
    avgJitter: 0,
    maxJitter: 0,
    currentJitter: 0,
    drift: 0
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastTickRef = useRef<number>(performance.now());
  const requestRef = useRef<number>();

  const updateMetrics = (newData: TimingData[]) => {
    if (newData.length === 0) return;
    
    const latest = newData[newData.length - 1];
    const jitterValues = newData.map(d => Math.abs(d.jitter));
    const avg = jitterValues.reduce((a, b) => a + b, 0) / jitterValues.length;
    const max = Math.max(...jitterValues);

    setMetrics({
      avgJitter: avg,
      maxJitter: max,
      currentJitter: latest.jitter,
      drift: latest.delta - EXPECTED_TICK_MS
    });
  };

  const drawGraph = (data: TimingData[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const step = width / HISTORY_LIMIT;

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Jitter Plot
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    
    data.forEach((point, i) => {
      const x = i * step;
      // Scale jitter: 1ms deviation = 10px
      const y = centerY + (point.jitter * 10);
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#ef4444');
    gradient.addColorStop(0.5, '#10b981');
    gradient.addColorStop(1, '#ef4444');
    
    ctx.strokeStyle = gradient;
    ctx.stroke();
  };

  const animate = (time: number) => {
    const delta = time - lastTickRef.current;
    lastTickRef.current = time;

    const jitter = delta - EXPECTED_TICK_MS;

    setHistory(prev => {
      const updated = [...prev, { timestamp: time, delta, jitter }].slice(-HISTORY_LIMIT);
      updateMetrics(updated);
      drawGraph(updated);
      return updated;
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const statusColor = useMemo(() => {
    const absJitter = Math.abs(metrics.currentJitter);
    if (absJitter < 1) return 'text-emerald-400';
    if (absJitter < 5) return 'text-amber-400';
    return 'text-rose-500';
  }, [metrics.currentJitter]);

  return (
    <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-2xl w-full max-w-2xl font-mono">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Activity className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-slate-100 font-bold text-sm tracking-wider uppercase">Timing Monitor</h3>
            <p className="text-slate-500 text-xs">Real-time Fixed-Tick Synchronizer</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 ${statusColor}`}>
          {Math.abs(metrics.currentJitter) < 2 ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
          <span className="text-[10px] font-bold tracking-widest uppercase">
            {Math.abs(metrics.currentJitter) < 2 ? 'Stable' : 'Unstable'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <Clock className="w-3 h-3" />
            <span className="text-[10px] uppercase tracking-tighter">Avg Jitter</span>
          </div>
          <div className="text-xl font-bold text-slate-100">
            {metrics.avgJitter.toFixed(3)} <span className="text-xs text-slate-500 font-normal">ms</span>
          </div>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <Activity className="w-3 h-3" />
            <span className="text-[10px] uppercase tracking-tighter">Max Peak</span>
          </div>
          <div className="text-xl font-bold text-slate-100 text-rose-400">
            {metrics.maxJitter.toFixed(3)} <span className="text-xs text-slate-500 font-normal">ms</span>
          </div>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <Clock className="w-3 h-3" />
            <span className="text-[10px] uppercase tracking-tighter">Drift</span>
          </div>
          <div className="text-xl font-bold text-slate-100">
            {metrics.drift > 0 ? '+' : ''}{metrics.drift.toFixed(3)} <span className="text-xs text-slate-500 font-normal">ms</span>
          </div>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute top-2 left-2 flex gap-4 text-[9px] text-slate-600 uppercase font-bold pointer-events-none">
          <div className="flex items-center gap-1">
            <div className="w-2 h-0.5 bg-emerald-500"></div>
            Ideal (0ms)
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-0.5 bg-rose-500"></div>
            Deviation
          </div>
        </div>
        <canvas 
          ref={canvasRef}
          width={600}
          height={160}
          className="w-full h-40 bg-slate-900/30 rounded-lg border border-slate-800/50"
        />
        <div className="absolute inset-0 pointer-events-none border border-indigo-500/0 group-hover:border-indigo-500/20 transition-colors duration-500 rounded-lg" />
      </div>

      <div className="mt-4 flex justify-between items-center text-[10px] text-slate-500 italic">
        <span>Sampling at {EXPECTED_TICK_MS.toFixed(2)}ms (60Hz)</span>
        <span className="flex items-center gap-1 uppercase not-italic font-bold tracking-widest text-indigo-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          Live Stream
        </span>
      </div>
    </div>
  );
};

export default TimingMonitor;