/**
 * ResonanceVisualizer - Biometric Feedback Dashboard
 * 
 * Parses 10-Hz chain-string format from Ouroboros-Engine
 * and displays as biometric feedback visualization.
 * 
 * Chain Format: T{type}|R{resonance}|P{phaseShift}|H{healthRatio}|I{inverseResonance}
 * - type: Plexity type (0-100)
 * - resonance: Current resonance value (0-1000 scaled)
 * - phaseShift: Phase shift in degrees (0-360)
 * - healthRatio: HP ratio (0-100)
 * - inverseResonance: 1/resonance for inverse calculation
 * 
 * Performance: Uses React.memo to prevent re-renders on unchanged ticks
 */

import React, { useMemo, useCallback, memo } from 'react';

/**
 * Parsed chain data from Ouroboros-Engine
 */
export interface ResonanceData {
  /** Plexity type (0-100) */
  type: number;
  /** Resonance value (scaled by 1000) */
  resonance: number;
  /** Phase shift in degrees (0-360) */
  phaseShift: number;
  /** HP ratio (0-100) */
  healthRatio: number;
  /** Inverse resonance (1/resonance) */
  inverseResonance: number;
  /** Raw tick count */
  tickCount: number;
  /** Parsed timestamp */
  timestamp: number;
}

/**
 * Plexity weights for dynamic styling
 * - 45% Type
 * - 35% HP-Ratio
 * - 20% Inverse Resonanz
 */
export const PLEXITY_WEIGHTS = {
  type: 0.45,
  healthRatio: 0.35,
  inverseResonance: 0.20
} as const;

/**
 * Default chain for initialization
 */
export const DEFAULT_CHAIN = 'T50|R500|P0|H100|I0';

/**
 * Parse 10-Hz chain string into ResonanceData
 * Format: T{type}|R{resonance}|P{phaseShift}|H{healthRatio}|I{inverseResonance}
 */
export function parseChain(chain: string | undefined): ResonanceData {
  if (!chain || typeof chain !== 'string') {
    return {
      type: 50,
      resonance: 500,
      phaseShift: 0,
      healthRatio: 100,
      inverseResonance: 0,
      tickCount: 0,
      timestamp: Date.now()
    };
  }

  const parts = chain.split('|');
  const parsed: Partial<ResonanceData> = {
    timestamp: Date.now()
  };

  for (const part of parts) {
    const key = part.charAt(0);
    const value = parseInt(part.slice(1), 10);

    switch (key) {
      case 'T':
        parsed.type = isNaN(value) ? 50 : Math.max(0, Math.min(100, value));
        break;
      case 'R':
        parsed.resonance = isNaN(value) ? 500 : value;
        break;
      case 'P':
        parsed.phaseShift = isNaN(value) ? 0 : Math.max(0, Math.min(360, value));
        break;
      case 'H':
        parsed.healthRatio = isNaN(value) ? 100 : Math.max(0, Math.min(100, value));
        break;
      case 'I':
        parsed.inverseResonance = isNaN(value) ? 0 : value;
        break;
      case 'N':
        parsed.tickCount = isNaN(value) ? 0 : value;
        break;
    }
  }

  return {
    type: parsed.type ?? 50,
    resonance: parsed.resonance ?? 500,
    phaseShift: parsed.phaseShift ?? 0,
    healthRatio: parsed.healthRatio ?? 100,
    inverseResonance: parsed.inverseResonance ?? 0,
    tickCount: parsed.tickCount ?? 0,
    timestamp: parsed.timestamp ?? Date.now()
  };
}

/**
 * Calculate Plexity score using weights
 * Formula: (type * 0.45) + (healthRatio * 0.35) + (inverseResonance * 0.20)
 */
export function calculatePlexityScore(data: ResonanceData): number {
  const { type, healthRatio, inverseResonance } = data;
  
  // Normalize inverse resonance (typically very small, scale to 0-100)
  const normalizedInverse = Math.min(100, inverseResonance / 10);
  
  return Math.round(
    (type * PLEXITY_WEIGHTS.type) +
    (healthRatio * PLEXITY_WEIGHTS.healthRatio) +
    (normalizedInverse * PLEXITY_WEIGHTS.inverseResonance)
  );
}

/**
 * Get color class based on metric value
 */
function getColorClass(value: number, max: number = 100): string {
  const percentage = (value / max) * 100;
  
  if (percentage >= 80) return 'text-emerald-400';
  if (percentage >= 60) return 'text-cyan-400';
  if (percentage >= 40) return 'text-amber-400';
  return 'text-rose-400';
}

/**
 * Get size class based on resonance value
 */
function getSizeClass(resonance: number): string {
  if (resonance >= 800) return 'scale-125';
  if (resonance >= 600) return 'scale-110';
  if (resonance >= 400) return 'scale-100';
  if (resonance >= 200) return 'scale-95';
  return 'scale-90';
}

/**
 * Props for ResonanceVisualizer
 */
interface ResonanceVisualizerProps {
  /** 10-Hz chain string from Ouroboros-Engine */
  chain?: string;
  /** Symbol or ID for the visualization */
  symbol?: string;
  /** Whether to show detailed metrics */
  showDetails?: boolean;
  /** Whether to animate changes */
  animate?: boolean;
  /** CSS class name */
  className?: string;
}

/**
 * ResonanceVisualizer Component
 * 
 * Displays parsed chain data as biometric feedback dashboard
 * Uses React.memo to prevent re-renders on unchanged ticks
 */
const ResonanceVisualizer: React.FC<ResonanceVisualizerProps> = memo(({
  chain,
  symbol = 'BIO',
  showDetails = true,
  animate = true,
  className = ''
}) => {
  // Parse chain data once (memoized per chain string)
  const data = useMemo(() => parseChain(chain), [chain]);
  
  // Calculate Plexity score (memoized)
  const plexityScore = useMemo(() => calculatePlexityScore(data), [data]);
  
  // Get color class for resonance (memoized)
  const resonanceColor = useMemo(
    () => getColorClass(data.resonance, 1000),
    [data.resonance]
  );
  
  // Get size class for resonance (memoized)
  const resonanceSize = useMemo(
    () => getSizeClass(data.resonance),
    [data.resonance]
  );
  
  // Dynamic styles for phase shift rotation
  const phaseShiftStyle = useMemo(() => ({
    transform: `rotate(${data.phaseShift}deg)`
  }), [data.phaseShift]);
  
  // Render handler with useCallback
  const handleInteraction = useCallback(() => {
    // Placeholder for interactive elements
  }, []);

  return (
    <div 
      className={`relative p-4 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 ${className}`}
      onClick={handleInteraction}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          {symbol}
        </span>
        <span className={`text-lg font-bold font-mono ${resonanceColor}`}>
          {plexityScore}%
        </span>
      </div>
      
      {/* Main Resonance Indicator */}
      <div className="relative flex items-center justify-center h-32 mb-3">
        {/* Phase shift ring */}
        <div 
          className={`absolute w-24 h-24 rounded-full border-2 border-slate-600/30 transition-transform duration-300 ${
            animate ? 'ease-out' : ''
          }`}
          style={phaseShiftStyle}
        />
        
        {/* Resonance circle */}
        <div 
          className={`
            relative rounded-full bg-gradient-to-br from-slate-800/90 to-slate-900/90
            flex items-center justify-center
            transition-all duration-200 ${animate ? 'ease-out' : ''}
            ${resonanceSize}
          `}
        >
          {/* Inner glow */}
          <div 
            className={`absolute inset-2 rounded-full bg-gradient-to-br from-${resonanceColor.split('-')[1]}-500/20 to-transparent blur-xl`}
          />
          
          {/* Value display */}
          <div className="relative text-center z-10">
            <div className={`text-2xl font-bold font-mono ${resonanceColor}`}>
              {(data.resonance / 10).toFixed(0)}
            </div>
            <div className="text-[10px] font-mono text-slate-500 uppercase">
              RES
            </div>
          </div>
        </div>
      </div>
      
      {/* Type & HP Bar */}
      {showDetails && (
        <div className="space-y-2">
          {/* Type Bar */}
          <div className="flex items-center gap-2">
            <span className="w-8 text-[10px] font-mono text-slate-400">TYPE</span>
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-200"
                style={{ width: `${data.type}%` }}
              />
            </div>
            <span className="w-8 text-[10px] font-mono text-slate-400 text-right">
              {data.type}
            </span>
          </div>
          
          {/* HP Ratio Bar */}
          <div className="flex items-center gap-2">
            <span className="w-8 text-[10px] font-mono text-slate-400">HP</span>
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-200 ${
                  data.healthRatio > 70 ? 'bg-emerald-500' :
                  data.healthRatio > 40 ? 'bg-amber-500' :
                  'bg-rose-500'
                }`}
                style={{ width: `${data.healthRatio}%` }}
              />
            </div>
            <span className="w-8 text-[10px] font-mono text-slate-400 text-right">
              {data.healthRatio}
            </span>
          </div>
          
          {/* Phase Shift */}
          <div className="flex items-center gap-2">
            <span className="w-8 text-[10px] font-mono text-slate-400">PHASE</span>
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-200"
                style={{ width: `${(data.phaseShift / 360) * 100}%` }}
              />
            </div>
            <span className="w-8 text-[10px] font-mono text-slate-400 text-right">
              {data.phaseShift}°
            </span>
          </div>
        </div>
      )}
      
      {/* Tick Count */}
      <div className="mt-2 text-[9px] font-mono text-slate-600 text-center">
        #{data.tickCount} ticks @ 10Hz
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if chain really changed
  return prevProps.chain === nextProps.chain;
});

// Set display name for debugging
ResonanceVisualizer.displayName = 'ResonanceVisualizer';

export default ResonanceVisualizer;

export {
  type ResonanceData
};