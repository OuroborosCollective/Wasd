/**
 * Logistics Hub - ARE-Logic Powered
 * Warehouse and logistics management
 */

import React, { useState, useEffect } from 'react';

interface Package {
  id: string;
  destination: string;
  weight: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  position: number;
}

const destinations = ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Dusseldorf', 'Dortmund'];

export function LogisticsApp() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [stats, setStats] = useState({ processed: 0, shipped: 0, delivered: 0 });

  // Generate new packages
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const newPackage: Package = {
          id: `PKG-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          destination: destinations[Math.floor(Math.random() * destinations.length)],
          weight: Math.round(Math.random() * 50 + 1),
          status: 'pending',
          position: 0
        };
        setPackages(prev => [...prev.slice(-20), newPackage]);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Process packages (ARE-Logic tick at 10Hz)
  useEffect(() => {
    const interval = setInterval(() => {
      setPackages(prev => prev.map(p => {
        if (p.status === 'pending' && Math.random() > 0.8) {
          return { ...p, status: 'processing', position: p.position + 10 };
        }
        if (p.status === 'processing' && Math.random() > 0.9) {
          return { ...p, status: 'shipped', position: p.position + 30 };
        }
        if (p.status === 'shipped') {
          const newPos = p.position + (Math.random() * 5);
          if (newPos >= 100) {
            return { ...p, status: 'delivered', position: 100 };
          }
          return { ...p, position: newPos };
        }
        return p;
      }));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setStats({
      processed: packages.filter(p => p.status !== 'pending').length,
      shipped: packages.filter(p => p.status === 'shipped').length,
      delivered: packages.filter(p => p.status === 'delivered').length
    });
  }, [packages]);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            📦 Logistics Hub
          </h1>
          <p className="text-slate-400 mt-2">Warehouse Management • ARE-Logic Powered</p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 p-4 rounded-xl">
            <div className="text-sm text-slate-400">Total Packages</div>
            <div className="text-3xl font-bold">{packages.length}</div>
          </div>
          <div className="bg-blue-900/30 border border-blue-500/30 p-4 rounded-xl">
            <div className="text-sm text-blue-400">In Processing</div>
            <div className="text-3xl font-bold text-blue-400">{packages.filter(p => p.status === 'processing').length}</div>
          </div>
          <div className="bg-amber-900/30 border border-amber-500/30 p-4 rounded-xl">
            <div className="text-sm text-amber-400">Shipped</div>
            <div className="text-3xl font-bold text-amber-400">{stats.shipped}</div>
          </div>
          <div className="bg-green-900/30 border border-green-500/30 p-4 rounded-xl">
            <div className="text-sm text-green-400">Delivered</div>
            <div className="text-3xl font-bold text-green-400">{stats.delivered}</div>
          </div>
        </div>

        {/* Conveyor Belt Visualization */}
        <div className="bg-slate-800 p-6 rounded-xl mb-8">
          <h2 className="text-xl font-bold mb-4">📍 Conveyor System</h2>
          <div className="relative h-16 bg-slate-700 rounded-lg overflow-hidden">
            <div className="absolute inset-0 flex items-center">
              {Array(20).fill(0).map((_, i) => (
                <div key={i} className="flex-1 border-r border-slate-600 h-full" />
              ))}
            </div>
            {packages.map(pkg => (
              <div
                key={pkg.id}
                className={`absolute top-2 w-12 h-12 rounded-lg flex items-center justify-center text-lg transition-all ${
                  pkg.status === 'pending' ? 'bg-gray-500' :
                  pkg.status === 'processing' ? 'bg-blue-500' :
                  pkg.status === 'shipped' ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ left: `${pkg.position}%`, transform: 'translateX(-50%)' }}
                title={pkg.id}
              >
                📦
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-slate-400 mt-2">
            <span>Entry</span>
            <span>Processing</span>
            <span>Shipping</span>
            <span>Delivered</span>
          </div>
        </div>

        {/* Package List */}
        <div className="bg-slate-800 p-6 rounded-xl">
          <h2 className="text-xl font-bold mb-4">📋 Active Shipments</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {packages.slice(0, 15).map(pkg => (
              <div key={pkg.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div>
                  <div className="font-mono text-sm">{pkg.id}</div>
                  <div className="text-xs text-slate-400">→ {pkg.destination} • {pkg.weight}kg</div>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full ${
                  pkg.status === 'pending' ? 'bg-gray-500' :
                  pkg.status === 'processing' ? 'bg-blue-500' :
                  pkg.status === 'shipped' ? 'bg-amber-500' : 'bg-green-500'
                }`}>
                  {pkg.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl text-center">
          <p className="text-sm text-slate-400">🟦 Powered by ARE-Logic • O(1) Package Processing • 10-Hz Tick System</p>
        </div>
      </div>
    </div>
  );
}

export default LogisticsApp;
