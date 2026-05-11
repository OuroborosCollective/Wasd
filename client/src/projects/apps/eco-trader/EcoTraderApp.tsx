/**
 * Eco-Trader - Carbon Credit Trading
 * Environmental trading platform
 */

import React, { useState, useEffect } from 'react';

export function EcoTraderApp() {
  const [credits, setCredits] = useState({ total: 15000, price: 25.50, traded: 2340 });

  useEffect(() => {
    const interval = setInterval(() => {
      setCredits(prev => ({
        ...prev,
        price: prev.price + (Math.random() - 0.5) * 0.5,
        traded: prev.traded + Math.floor(Math.random() * 3)
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2">🌱 Eco-Trader</h1>
        <p className="text-center text-green-300 mb-8">Carbon Credit Trading • ARE-Logic</p>
        
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800 p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">{credits.total.toLocaleString()}</div>
            <div className="text-sm text-slate-400">Total Credits</div>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl text-center">
            <div className="text-3xl font-bold text-green-400">${credits.price.toFixed(2)}</div>
            <div className="text-sm text-slate-400">Price per Ton</div>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl text-center">
            <div className="text-3xl font-bold text-cyan-400">{credits.traded.toLocaleString()}</div>
            <div className="text-sm text-slate-400">Traded Today</div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl">
          <h2 className="text-xl font-bold mb-4">Market Activity</h2>
          {[1,2,3].map(i => (
            <div key={i} className="flex justify-between p-3 bg-slate-700 rounded-lg mb-2">
              <span>Company {String.fromCharCode(64+i)}</span>
              <span className="text-green-400">+{Math.floor(Math.random()*100)} credits</span>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-slate-400">
          🟦 Powered by ARE-Logic • O(1) Trading
        </div>
      </div>
    </div>
  );
}

export default EcoTraderApp;
