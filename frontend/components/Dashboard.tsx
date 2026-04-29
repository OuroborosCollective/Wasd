"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  Cell
} from 'recharts';
import { Activity, Zap, BarChart3, RefreshCw, AlertCircle } from 'lucide-react';

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

const Dashboard = () => {
  const [weights, setWeights] = useState<WeightTrend[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([]);
  const [status, setStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [metrics, setMetrics] = useState({
    conversionRate: 0,
    totalEvents: 0,
    avgLatency: 0
  });

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080/stats');

    socket.onopen = () => setStatus('connected');
    socket.onclose = () => setStatus('disconnected');
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'WEIGHT_UPDATE') {
        setWeights(prev => [...prev.slice(-19), {
          timestamp: new Date().toLocaleTimeString(),
          ...data.payload
        }]);
      }
      
      if (data.type === 'HEATMAP_UPDATE') {
        setHeatmap(data.payload);
      }

      if (data.type === 'METRICS_UPDATE') {
        setMetrics(data.payload);
      }
    };

    // Fallback data generation for demonstration if no server
    const interval = setInterval(() => {
      if (status === 'disconnected') {
        setWeights(prev => {
          const next = [...prev.slice(-19), {
            timestamp: new Date().toLocaleTimeString(),
            weightA: Math.random() * 100,
            weightB: Math.random() * 100,
            weightC: Math.random() * 100,
          }];
          return next;
        });

        const mockHeatmap = [];
        for(let i=0; i<24; i++) {
          for(let j=0; j<7; j++) {
            mockHeatmap.push({ hour: i, day: j, value: Math.floor(Math.random() * 100) });
          }
        }
        setHeatmap(mockHeatmap);
        
        setMetrics({
          conversionRate: 3.45 + Math.random(),
          totalEvents: 12450 + Math.floor(Math.random() * 100),
          avgLatency: 45 + Math.random() * 10
        });
      }
    }, 3000);

    return () => {
      socket.close();
      clearInterval(interval);
    };
  }, [status]);

  const getColor = (value: number) => {
    const hue = (1 - value / 100) * 240;
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Heuristic Analytics Engine</h1>
            <p className="text-slate-400 mt-1">Real-time optimization monitoring</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${status === 'connected' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              {status.toUpperCase()}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400"><BarChart3 size={24} /></div>
              <div>
                <p className="text-sm text-slate-400">Conversion Rate</p>
                <p className="text-2xl font-bold">{metrics.conversionRate.toFixed(2)}%</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400"><Activity size={24} /></div>
              <div>
                <p className="text-sm text-slate-400">Total Events</p>
                <p className="text-2xl font-bold">{metrics.totalEvents.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400"><Zap size={24} /></div>
              <div>
                <p className="text-sm text-slate-400">Latency (avg)</p>
                <p className="text-2xl font-bold">{metrics.avgLatency.toFixed(1)}ms</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <RefreshCw className="text-blue-400" size={20} />
              Optimization Trend
            </h2>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weights}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timestamp" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="weightA" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="weightB" stroke="#a855f7" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="weightC" stroke="#eab308" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <AlertCircle className="text-emerald-400" size={20} />
              Conversion Heatmap (Day/Hour)
            </h2>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <XAxis type="number" dataKey="hour" name="Hour" domain={[0, 23]} stroke="#64748b" tickCount={12} />
                  <YAxis type="number" dataKey="day" name="Day" domain={[0, 6]} stroke="#64748b" tickFormatter={(v) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][v]} />
                  <ZAxis type="number" dataKey="value" range={[50, 400]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                  <Scatter name="Conversion Intensity" data={heatmap}>
                    {heatmap.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getColor(entry.value)} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;