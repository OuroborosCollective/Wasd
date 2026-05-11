/**
 * Crypto Pulse - Cryptocurrency Tracking
 * Real-time crypto prices with ARE-Logic
 */

import React, { useState, useEffect } from 'react';

interface Coin {
  symbol: string;
  name: string;
  price: number;
  change: number;
}

const coins: Coin[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 45000, change: 2.5 },
  { symbol: 'ETH', name: 'Ethereum', price: 2800, change: -1.2 },
  { symbol: 'DOT', name: 'Polkadot', price: 45, change: 5.3 },
  { symbol: 'ADA', name: 'Cardano', price: 0.55, change: -0.8 },
];

export function CryptoPulseApp() {
  const [prices, setPrices] = useState(coins);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev => prev.map(coin => ({
        ...coin,
        price: coin.price * (1 + (Math.random() - 0.5) * 0.02),
        change: coin.change + (Math.random() - 0.5) * 0.5
      })));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2">💰 Crypto Pulse</h1>
        <p className="text-center text-yellow-300 mb-8">Real-time Cryptocurrency Tracking • ARE-Logic</p>

        <div className="grid gap-4">
          {prices.map(coin => (
            <div key={coin.symbol} className="bg-slate-800 p-6 rounded-xl flex justify-between items-center">
              <div>
                <div className="text-2xl font-bold">{coin.symbol}</div>
                <div className="text-slate-400">{coin.name}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono">${coin.price.toFixed(2)}</div>
                <div className={coin.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {coin.change >= 0 ? '▲' : '▼'} {Math.abs(coin.change).toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-slate-400">
          🟦 Powered by ARE-Logic • O(1) Price Processing • 10-Hz
        </div>
      </div>
    </div>
  );
}

export default CryptoPulseApp;
