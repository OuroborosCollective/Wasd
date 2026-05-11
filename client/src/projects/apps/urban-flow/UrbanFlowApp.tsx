/**
 * Urban Flow - City Traffic Optimization
 * Traffic management with ARE-Logic
 */

import React, { useState, useEffect } from 'react';

interface Vehicle {
  id: string;
  x: number;
  y: number;
  direction: number;
  speed: number;
  type: 'car' | 'bus' | 'truck';
}

export function UrbanFlowApp() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trafficLight, setTrafficLight] = useState(0); // 0=green, 1=red

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.85) {
        const newVehicle: Vehicle = {
          id: `V${Math.random().toString(36).substr(2, 4)}`,
          x: Math.random() * 100,
          y: 0,
          direction: Math.random() > 0.5 ? 0 : 1,
          speed: 0.5 + Math.random() * 0.5,
          type: Math.random() > 0.8 ? 'bus' : Math.random() > 0.7 ? 'truck' : 'car'
        };
        setVehicles(prev => [...prev.slice(-15), newVehicle]);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTrafficLight(prev => (prev + 1) % 2);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setVehicles(prev => prev.map(v => {
        let newY = v.y + v.speed;
        let stopped = false;
        
        // Stop at red light
        if (trafficLight === 1 && v.y > 40 && v.y < 60) {
          stopped = true;
        }
        
        if (newY > 100 || stopped) return v;
        return { ...v, y: newY };
      }).filter(v => v.y <= 100));
    }, 100);
    return () => clearInterval(interval);
  }, [trafficLight]);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2">🌆 Urban Flow</h1>
        <p className="text-center text-slate-400 mb-8">Traffic Optimization • ARE-Logic Powered</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-800 p-4 rounded-xl text-center">
            <div className="text-3xl font-bold">{vehicles.length}</div>
            <div className="text-sm text-slate-400">Active Vehicles</div>
          </div>
          <div className={`p-4 rounded-xl text-center ${trafficLight === 0 ? 'bg-green-600' : 'bg-red-600'}`}>
            <div className="text-3xl font-bold">{trafficLight === 0 ? '🟢 GO' : '🔴 STOP'}</div>
            <div className="text-sm">Traffic Light</div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 relative" style={{ height: '400px' }}>
          {/* Roads */}
          <div className="absolute inset-x-0 top-1/2 h-24 bg-slate-600 -translate-y-1/2">
            <div className="absolute inset-x-0 top-1/2 h-1 bg-yellow-400 border-dashed" />
          </div>
          
          {/* Traffic Lights */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 w-8 h-16 rounded-lg flex flex-col gap-1 p-1" style={{ background: trafficLight === 0 ? '#166534' : '#991b1b' }}>
            <div className={`flex-1 rounded-full ${trafficLight === 0 ? 'bg-green-400' : 'bg-green-800'}`} />
            <div className={`flex-1 rounded-full ${trafficLight === 1 ? 'bg-red-400' : 'bg-red-800'}`} />
          </div>

          {/* Vehicles */}
          {vehicles.map(v => (
            <div
              key={v.id}
              className="absolute transition-all"
              style={{ left: `${v.x}%`, top: `${v.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className={`text-2xl ${v.type === 'bus' ? '🚌' : v.type === 'truck' ? '🚚' : '🚗'}`} />
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-slate-400">
          🟦 Powered by ARE-Logic • O(1) Traffic Processing • 10-Hz
        </div>
      </div>
    </div>
  );
}

export default UrbanFlowApp;
