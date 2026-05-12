import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Timer, Trophy, Target, Zap } from 'lucide-react';

/**
 * Interface definition extended to fix TS2339 errors
 */
export interface WarfrontHudState {
  isActive: boolean;
  title: string;
  description: string;
  phase: 'PREPARATION' | 'BATTLE' | 'CLEANUP' | 'IDLE';
  endsAt: number; // Unix timestamp
  progressPct: number;
  personal: {
    contribution: number;
    rank: string;
    score: number;
    rewards: string[];
  };
}

interface WarfrontPanelProps {
  state: WarfrontHudState;
}

export const WarfrontPanel: React.FC<WarfrontPanelProps> = ({ state }) => {
  const [timeLeft, setTimeLeft] = useState<string>('00:00');

  useEffect(() => {
    if (!state.endsAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = state.endsAt - now;

      if (diff <= 0) {
        setTimeLeft('00:00');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    const interval = setInterval(updateTimer, 1000);
    updateTimer();

    return () => clearInterval(interval);
  }, [state.endsAt]);

  if (!state.isActive) return null;

  const getPhaseColor = () => {
    switch (state.phase) {
      case 'PREPARATION': return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
      case 'BATTLE': return 'text-red-400 border-red-500/30 bg-red-500/10';
      case 'CLEANUP': return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      default: return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        className="fixed top-20 right-6 w-80 z-40"
      >
        {/* Main Header Card */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-black text-xl text-white tracking-tighter uppercase italic">
                {state.title}
              </h3>
              <div className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getPhaseColor()}`}>
                {state.phase}
              </div>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              {state.description}
            </p>
          </div>

          {/* Progress Section */}
          <div className="p-4 space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                <span className="text-slate-400 flex items-center gap-1">
                  <Target size={12} aria-hidden="true" /> Objective Progress
                </span>
                <span className="text-white">{state.progressPct}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Objective Progress"
                aria-valuenow={state.progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700"
              >
                <motion.div 
                  className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${state.progressPct}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 bg-slate-950/50 p-2 rounded-lg border border-slate-800 flex flex-col items-center">
                <Timer size={14} className="text-blue-400 mb-1" aria-hidden="true" />
                <span className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Time Left</span>
                <span className="text-lg font-mono font-bold text-white leading-none">{timeLeft}</span>
              </div>
              <div className="flex-1 bg-slate-950/50 p-2 rounded-lg border border-slate-800 flex flex-col items-center">
                <Zap size={14} className="text-amber-400 mb-1" aria-hidden="true" />
                <span className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Score</span>
                <span className="text-lg font-mono font-bold text-white leading-none">{state.personal.score}</span>
              </div>
            </div>
          </div>

          {/* Personal Stats Section */}
          <div className="bg-slate-950/60 p-4 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} className="text-red-500" aria-hidden="true" />
              <span className="text-xs font-black uppercase text-slate-300">Personal Contribution</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[9px] text-slate-500 uppercase font-bold">Contribution</span>
                <span className="text-sm font-bold text-white">{state.personal.contribution}%</span>
              </div>
              <div>
                <span className="block text-[9px] text-slate-500 uppercase font-bold">Current Rank</span>
                <span className="text-sm font-bold text-amber-400 flex items-center gap-1">
                  <Trophy size={12} aria-hidden="true" /> {state.personal.rank}
                </span>
              </div>
            </div>

            {state.personal.rewards.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-800/50">
                <span className="block text-[9px] text-slate-500 uppercase font-bold mb-1 italic">Potential Loot:</span>
                <div className="flex flex-wrap gap-1">
                  {state.personal.rewards.map((reward, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-slate-800 rounded text-[9px] text-slate-300 border border-slate-700">
                      {reward}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tactical Overlay Pulse */}
        {state.phase === 'BATTLE' && (
          <motion.div 
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -inset-1 border border-red-500/30 rounded-xl pointer-events-none"
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default WarfrontPanel;