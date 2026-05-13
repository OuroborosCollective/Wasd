import React, { useState, useMemo, useCallback } from 'react';

/**
 * SOVEREIGN AAAA+ COMPILER - PHASE 2 ENGAGEMENT GRID
 * MANDATE: O(1) Complexity, Total Determinism, Integer-only (BigInt/kappaPos)
 * WAKEUP SHIELD STRATEGIC CONTENT MIX
 * STATUS: STABLE DETERMINISTIC (NO_FLOAT_MODE)
 */

// --- DETERMINISTIC CONSTANTS (KAPPA SCALE: 10000 = 100.00%) ---
const KAPPA_SCALE = 10000n;
const EFFICIENCY_FACTOR = 8500n; // 85% efficiency expressed as kappaPos
const SYSTEM_DETERMINISTIC_CLOCK = 1714554000; // Static epoch for UI consistency

interface PhaseContent {
  readonly id: number;
  readonly label: string;
  readonly description: string;
  readonly intensity: bigint;
}

// O(1) REGISTRY
const STRATEGIC_CONTENT_MAP: Record<number, PhaseContent> = {
  1: { id: 1, label: "ANALYSIS", description: "Deep-Dive System Audit and Pattern Identification", intensity: 3000n },
  2: { id: 2, label: "DEPLOYMENT", description: "Automated Shield Activation and Traffic Shaping", intensity: 6500n },
  3: { id: 3, label: "OPTIMIZATION", description: "Strategic Cost Brake and Resource Re-Allocation", intensity: 9500n },
};

// DEFAULT FALLBACK (Mandate: Null-Pointer Prevention)
const DEFAULT_CONTENT: PhaseContent = {
  id: 0,
  label: "INACTIVE",
  description: "System Standby - No Phase Selected",
  intensity: 0n
};

/**
 * DETERMINISTIC FORMATTER
 * Prevents locale-dependent jitter (Mandate: Determinism)
 */
const formatInt = (val: number | bigint): string => {
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/**
 * STATELESS DETERMINISTIC LOGIC (Integer-only via BigInt)
 * Prevents 32-bit overflow and floating point inaccuracies
 */
const calculateSovereignSavings = (inputVolume: number, shieldIntensity: bigint): bigint => {
  const vol = BigInt(inputVolume);
  // ProtectionValue = (Volume * Intensity) / Scale
  const protectionValue = (vol * shieldIntensity) / KAPPA_SCALE;
  // Savings = (ProtectionValue * Efficiency) / Scale
  const savings = (protectionValue * EFFICIENCY_FACTOR) / KAPPA_SCALE;
  return savings;
};

export const Phase2EngagementGrid: React.FC = () => {
  const [inputVolume, setInputVolume] = useState<number>(100000);
  const [activePhase, setActivePhase] = useState<number>(1);

  // O(1) Lookup with Deterministic Fallback
  const content = useMemo(() => 
    STRATEGIC_CONTENT_MAP[activePhase] || DEFAULT_CONTENT, 
    [activePhase]
  );

  // Deterministic Cost Brake Calculation (BigInt ensures zero float usage)
  const projectedSavings = useMemo(() => 
    calculateSovereignSavings(inputVolume, content.intensity), 
    [inputVolume, content.intensity]
  );

  // Deterministic UI Percentage Calculation (Integer-based)
  const intensityPercent = useMemo(() => 
    Number((content.intensity * 100n) / KAPPA_SCALE),
    [content.intensity]
  );

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setInputVolume(isNaN(val) ? 0 : val);
  }, []);

  return (
    <div className="w-full bg-slate-950 text-slate-100 p-6 rounded-lg border border-slate-800 shadow-2xl font-mono">
      <div className="mb-8 border-b border-slate-800 pb-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold tracking-tighter text-blue-400">
            WAKEUP_SHIELD // PHASE_2_ENGAGEMENT
          </h2>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 border border-emerald-500/20">
            BIGINT_PRECISION: ACTIVE
          </span>
        </div>
        <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">
          Sovereign Control Grid v4.1.0_DETERMINISTIC
        </p>
      </div>

      {/* O(1) Static Grid Selection - Explicit rendering to guarantee O(1) path */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => setActivePhase(1)}
          className={`p-4 border transition-all duration-200 text-left ${activePhase === 1 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-900/50'}`}
        >
          <div className="text-xs text-slate-500 mb-1">PHASE_01</div>
          <div className="font-bold">{STRATEGIC_CONTENT_MAP[1].label}</div>
        </button>
        <button
          onClick={() => setActivePhase(2)}
          className={`p-4 border transition-all duration-200 text-left ${activePhase === 2 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-900/50'}`}
        >
          <div className="text-xs text-slate-500 mb-1">PHASE_02</div>
          <div className="font-bold">{STRATEGIC_CONTENT_MAP[2].label}</div>
        </button>
        <button
          onClick={() => setActivePhase(3)}
          className={`p-4 border transition-all duration-200 text-left ${activePhase === 3 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-900/50'}`}
        >
          <div className="text-xs text-slate-500 mb-1">PHASE_03</div>
          <div className="font-bold">{STRATEGIC_CONTENT_MAP[3].label}</div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Detail Section */}
        <div className="space-y-4">
          <div className="bg-slate-900 p-6 border border-slate-800">
            <h3 className="text-blue-400 text-sm font-bold mb-2 uppercase tracking-wider">Strategic Objective</h3>
            <p className="text-slate-300 text-sm leading-relaxed h-12">
              {content.description}
            </p>
            <div className="mt-6">
               <div className="flex justify-between text-[10px] text-slate-500 mb-2 uppercase">
                 <span>Intensity_Protocol</span>
                 <span>{content.intensity.toString()} / {KAPPA_SCALE.toString()}</span>
               </div>
              <div className="h-1.5 w-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500" 
                  style={{ width: `${intensityPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cost Brake Interactive Logic */}
        <div className="bg-slate-900 p-6 border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 text-[10px] text-slate-800 select-none">SOVEREIGN_ENGINE_BIGINT</div>
          <h3 className="text-emerald-400 text-sm font-bold mb-4 uppercase tracking-wider">Interactive Cost Brake</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] text-slate-500 mb-2 uppercase italic tracking-tighter">Volume Input (Units)</label>
              <input 
                type="range" 
                min="1000" 
                max="1000000" 
                step="1000"
                value={inputVolume}
                onChange={handleVolumeChange}
                className="w-full h-1 bg-slate-800 appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="mt-2 text-xl font-bold tracking-tight">
                {formatInt(inputVolume)} <span className="text-xs text-slate-600">REQ/S</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase mb-1">Projected Mitigation (Verified)</div>
              <div className="text-3xl font-black text-emerald-500 tracking-tighter">
                {formatInt(projectedSavings)} <span className="text-sm font-normal text-emerald-700">INT_UNITS</span>
              </div>
              <p className="text-[10px] text-slate-600 mt-3 border-l border-emerald-900/50 pl-2">
                LOGIC: BigInt arithmetic active. No 32-bit overflow possible. Locale-independent formatting applied.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between items-center text-[10px] text-slate-700 border-t border-slate-900 pt-4 uppercase">
        <span>Kernel: Stateless_BigInt_V4</span>
        <span>Registry: 0xAAAA_GRID_COMPILER</span>
        <span>Clock: {SYSTEM_DETERMINISTIC_CLOCK}</span>
      </div>
    </div>
  );
};

export default Phase2EngagementGrid;