/**
 * Arena - Gaming Platform
 */

import React, { useState } from 'react';

export function ArenaApp() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const games = [
    { id: 'chess', name: 'Chess', icon: '♟️', players: 1240 },
    { id: 'go', name: 'Go', icon: '⭕', players: 890 },
    { id: 'poker', name: 'Poker', icon: '🃏', players: 3420 },
    { id: 'checkers', name: 'Checkers', icon: '🔴', players: 560 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2">⚔️ Arena</h1>
        <p className="text-center text-red-300 mb-8">Gaming Platform • ARE-Logic</p>
        
        <div className="grid grid-cols-2 gap-4">
          {games.map(game => (
            <button key={game.id} onClick={() => setActiveGame(game.id)} className="bg-slate-800 p-6 rounded-xl hover:bg-red-800 transition-colors text-center">
              <div className="text-5xl mb-2">{game.icon}</div>
              <div className="text-xl font-bold">{game.name}</div>
              <div className="text-sm text-slate-400">{game.players} players online</div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-slate-400">
          🟦 Powered by ARE-Logic • O(1) Match Processing
        </div>
      </div>
    </div>
  );
}

export default ArenaApp;
