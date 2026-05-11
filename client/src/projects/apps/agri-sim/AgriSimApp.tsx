/**
 * Agri-Sim - Agricultural Simulation
 * Farm management with ARE-Logic deterministic growth
 */

import React, { useState, useEffect } from 'react';

interface Crop {
  id: string;
  type: string;
  growth: number; // 0-100
  water: number; // 0-100
  health: number;
  harvestTime: number;
}

const cropTypes = ['Wheat', 'Corn', 'Barley', 'Potatoes', 'Carrots'];

export function AgriSimApp() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [day, setDay] = useState(1);

  // Initialize crops
  useEffect(() => {
    const initial: Crop[] = Array(12).fill(0).map((_, i) => ({
      id: `crop-${i}`,
      type: cropTypes[i % cropTypes.length],
      growth: Math.random() * 30,
      water: 50 + Math.random() * 30,
      health: 80 + Math.random() * 20,
      harvestTime: 10 + Math.floor(Math.random() * 10)
    }));
    setCrops(initial);
  }, []);

  // Growth simulation (ARE-Logic tick at 10Hz)
  useEffect(() => {
    const interval = setInterval(() => {
      setCrops(prev => prev.map(crop => {
        let water = crop.water - 0.1;
        let growth = crop.growth;
        let health = crop.health;

        if (water > 30 && water < 80 && health > 50) {
          growth += 0.05;
        }
        if (water < 20) health -= 0.1;
        if (water > 90) health -= 0.05;

        return { ...crop, water: Math.max(0, Math.min(100, water)), growth: Math.min(100, growth), health: Math.max(0, health) };
      }));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const waterAll = () => setCrops(prev => prev.map(c => ({ ...c, water: Math.min(100, c.water + 30) })));
  const harvest = () => setCrops(prev => prev.filter(c => c.growth < 100));

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold">🌾 Agri-Sim</h1>
          <p className="text-green-300 mt-2">Agricultural Simulation • Day {day}</p>
        </header>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <button onClick={waterAll} className="bg-blue-600 p-4 rounded-xl hover:bg-blue-500">
            💧 Water All
          </button>
          <button onClick={harvest} className="bg-amber-600 p-4 rounded-xl hover:bg-amber-500">
            🌾 Harvest Ready
          </button>
          <div className="bg-slate-800 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold">{crops.filter(c => c.growth >= 100).length}</div>
            <div className="text-sm text-slate-400">Ready to Harvest</div>
          </div>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
          {crops.map(crop => (
            <div key={crop.id} className="bg-slate-800/80 p-4 rounded-xl">
              <div className="text-lg font-bold">{crop.type}</div>
              <div className="mt-2">
                <div className="text-xs text-slate-400">Growth</div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 transition-all" style={{ width: `${crop.growth}%` }} />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xs text-slate-400">Water</div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${crop.water}%` }} />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xs text-slate-400">Health</div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full ${crop.health > 70 ? 'bg-green-500' : crop.health > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${crop.health}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-slate-400">
          🟦 Powered by ARE-Logic • Deterministic Growth Simulation
        </div>
      </div>
    </div>
  );
}

export default AgriSimApp;
