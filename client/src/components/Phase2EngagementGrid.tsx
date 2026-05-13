/**
 * Phase2EngagementGrid - WakeUpShield Strategic Engagement System
 * 
 * 3-Phasen-Modell datengetrieben mit Kostenbremse:
 * - Phase 1: EXPLORATION (0-33%) - Entdeckungsmodus
 * - Phase 2: ENGAGEMENT (34-66%) - Interaktionsmodus  
 * - Phase 3: DOMINATION (67-100%) - Kontrollmodus
 * 
 * Kostenbremse: Interaktiver State für Ressourcenberechnung
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Phase des 3-Phasen-Modells
 */
export enum EngagementPhase {
  EXPLORATION = 'EXPLORATION',
  ENGAGEMENT = 'ENGAGEMENT', 
  DOMINATION = 'DOMINATION'
}

/**
 * Kostenbremse Konfiguration
 */
export interface CostBrakeConfig {
  baseCost: number;
  engagementMultiplier: number;
  phaseMultiplier: number;
  tickRateMs: number;
}

/**
 * Phase Konfiguration
 */
export interface PhaseConfig {
  minProgress: number;
  maxProgress: number;
  phaseName: string;
  color: string;
  costMultiplier: number;
}

/**
 * Standard-Phasen-Konfiguration
 */
export const DEFAULT_PHASE_CONFIGS: PhaseConfig[] = [
  { minProgress: 0, maxProgress: 33, phaseName: 'EXPLORATION', color: '#00f3ff', costMultiplier: 0.5 },
  { minProgress: 34, maxProgress: 66, phaseName: 'ENGAGEMENT', color: '#ffaa00', costMultiplier: 1.0 },
  { minProgress: 67, maxProgress: 100, phaseName: 'DOMINATION', color: '#ff3366', costMultiplier: 1.5 }
];

/**
 * Standard Kostenbremse
 */
export const DEFAULT_COST_BRAKE_CONFIG: CostBrakeConfig = {
  baseCost: 100,
  engagementMultiplier: 1.0,
  phaseMultiplier: 1.0,
  tickRateMs: 100 // 10-Hz
};

/**
 * Berechnet die aktive Phase basierend auf Progress
 */
export function calculateActivePhase(progress: number): EngagementPhase {
  if (progress <= 33) return EngagementPhase.EXPLORATION;
  if (progress <= 66) return EngagementPhase.ENGAGEMENT;
  return EngagementPhase.DOMINATION;
}

/**
 * Berechnet Kosten basierend auf Phase und Progress (Kappa-pos skaliert)
 */
export function calculateCost(
  baseCost: number,
  phase: EngagementPhase,
  progress: number,
  kappaPos: number = 1000
): number {
  const phaseMultiplier = phase === EngagementPhase.EXPLORATION ? 0.5
    : phase === EngagementPhase.ENGAGEMENT ? 1.0
    : 1.5;
  
  // Progress-based decay
  const progressDecay = Math.max(0.1, 1 - (progress / 200));
  
  // Kappa-scaled integer calculation
  const scaledCost = Math.floor(
    (baseCost * phaseMultiplier * progressDecay * kappaPos) + 0.5
  );
  
  return scaledCost;
}

/**
 * Phase2EngagementGrid Props
 */
interface Phase2EngagementGridProps {
  /** Aktueller Engagement-Wert (0-100) */
  engagementValue: number;
  /** Callback bei Änderung */
  onEngagementChange?: (value: number, phase: EngagementPhase) => void;
  /** Kostenbremse Konfiguration */
  costBrakeConfig?: Partial<CostBrakeConfig>;
  /** Benutzerdefinierte Styles */
  className?: string;
  /** Ob Komponente aktiviert ist */
  disabled?: boolean;
}

/**
 * Phase2EngagementGrid Komponente
 * 
 * Implementiert das 3-Phasen-Modell mit Kostenbremse
 */
export const Phase2EngagementGrid: React.FC<Phase2EngagementGridProps> = ({
  engagementValue,
  onEngagementChange,
  costBrakeConfig = DEFAULT_COST_BRAKE_CONFIG,
  className,
  disabled = false
}) => {
  // Interaktiver State für Kostenbremse
  const [localEngagement, setLocalEngagement] = useState(engagementValue);
  const [isInteracting, setIsInteracting] = useState(false);
  const [lastInteractionTime, setLastInteractionTime] = useState(0);
  
  // Berechne aktuelle Phase
  const currentPhase = useMemo(
    () => calculateActivePhase(localEngagement),
    [localEngagement]
  );
  
  // Berechne Kosten mit KappaPos-Skalierung
  const displayCost = useMemo(
    () => calculateCost(
      costBrakeConfig.baseCost,
      currentPhase,
      localEngagement,
      1000 // kappaPos = 1000 für UI-Anzeige
    ),
    [costBrakeConfig.baseCost, currentPhase, localEngagement]
  );
  
  // Phase-Konfiguration finden
  const phaseConfig = useMemo(
    () => DEFAULT_PHASE_CONFIGS.find(
      p => localEngagement >= p.minProgress && localEngagement <= p.maxProgress
    ) || DEFAULT_PHASE_CONFIGS[0],
    [localEngagement]
  );
  
  // Handler für Engagement-Änderung
  const handleEngagementChange = useCallback((newValue: number) => {
    const clampedValue = Math.max(0, Math.min(100, newValue));
    setLocalEngagement(clampedValue);
    setLastInteractionTime(Date.now());
    
    if (onEngagementChange) {
      const phase = calculateActivePhase(clampedValue);
      onEngagementChange(clampedValue, phase);
    }
  }, [onEngagementChange]);
  
  // Synchronisiere mit prop wenn nicht interagierend
  useEffect(() => {
    if (!isInteracting) {
      setLocalEngagement(engagementValue);
    }
  }, [engagementValue, isInteracting]);
  
  // Keyboard-Handler für Steuerung
  useEffect(() => {
    if (disabled) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') {
        setIsInteracting(true);
        handleEngagementChange(localEngagement + 5);
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        setIsInteracting(true);
        handleEngagementChange(localEngagement - 5);
      }
    };
    
    const handleKeyUp = () => {
      setIsInteracting(false);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [disabled, localEngagement, handleEngagementChange]);
  
  // Phase-Indikator Positionen berechnen
  const phaseIndicators = useMemo(() => 
    DEFAULT_PHASE_CONFIGS.map((config, index) => ({
      ...config,
      position: index * 33.33 // Position in Prozent
    })), 
  []);
  
  // Styles
  const containerStyle: React.CSSProperties = {
    background: 'rgba(10, 15, 25, 0.9)',
    border: `1px solid ${phaseConfig.color}55`,
    borderRadius: '8px',
    padding: '20px',
    width: '320px',
    minHeight: '200px',
    fontFamily: '"Orbitron", "Inter", sans-serif',
    color: '#e0e0e0',
    backdropFilter: 'blur(12px)',
    position: 'relative',
    overflow: 'hidden',
    opacity: disabled ? 0.5 : 1,
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
    boxShadow: isInteracting ? `0 0 30px ${phaseConfig.color}44` : 'none'
  };
  
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: `1px solid rgba(255,255,255,0.1)`
  };
  
  const phaseLabelStyle: React.CSSProperties = {
    fontSize: '11px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: phaseConfig.color,
    fontWeight: 700
  };
  
  const progressBarContainerStyle: React.CSSProperties = {
    height: '8px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '4px',
    position: 'relative',
    marginBottom: '16px',
    overflow: 'hidden'
  };
  
  const progressBarFillStyle: React.CSSProperties = {
    height: '100%',
    width: `${localEngagement}%`,
    background: `linear-gradient(90deg, ${phaseConfig.color}88, ${phaseConfig.color})`,
    borderRadius: '4px',
    transition: 'width 0.15s ease-out, background 0.3s ease'
  };
  
  const phaseMarkersStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'space-between',
    pointerEvents: 'none'
  };
  
  const costDisplayStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.3)',
    border: `1px solid ${phaseConfig.color}33`,
    borderRadius: '4px',
    padding: '12px',
    marginTop: '12px'
  };
  
  const costLabelStyle: React.CSSProperties = {
    fontSize: '9px',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '4px'
  };
  
  const costValueStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    color: phaseConfig.color,
    fontFamily: '"Orbitron", monospace'
  };
  
  const instructionStyle: React.CSSProperties = {
    fontSize: '8px',
    letterSpacing: '1px',
    color: 'rgba(255,255,255,0.3)',
    marginTop: '12px',
    textAlign: 'center'
  };

  return (
    <motion.div
      className={className}
      style={containerStyle}
      onMouseDown={() => setIsInteracting(true)}
      onMouseUp={() => setIsInteracting(false)}
      onMouseLeave={() => setIsInteracting(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div style={headerStyle}>
        <span style={phaseLabelStyle}>
          {phaseConfig.phaseName}
        </span>
        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>
          {Math.round(localEngagement)}%
        </span>
      </div>
      
      {/* Progress Bar */}
      <div style={progressBarContainerStyle}>
        <motion.div 
          style={progressBarFillStyle}
          layoutId="engagementProgress"
        />
        {/* Phase Markers */}
        <div style={phaseMarkersStyle}>
          {phaseIndicators.map((marker, i) => (
            <div
              key={marker.phaseName}
              style={{
                position: 'absolute',
                left: `${marker.position}%`,
                top: 0,
                bottom: 0,
                width: '2px',
                background: i < phaseIndicators.findIndex(p => p.phaseName === phaseConfig.phaseName)
                  ? marker.color 
                  : 'rgba(255,255,255,0.1)',
                transition: 'background 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Kostenbremse Display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPhase}
          style={costDisplayStyle}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
        >
          <div style={costLabelStyle}>
            KOSTENBREMSEN ({currentPhase})
          </div>
          <div style={costValueStyle}>
            {displayCost.toLocaleString()}
          </div>
          <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
            BASE: {costBrakeConfig.baseCost} × PHASE: {phaseConfig.costMultiplier}x
          </div>
        </motion.div>
      </AnimatePresence>
      
      {/* Steuerungshinweis */}
      <div style={instructionStyle}>
        ↑↓ / W-S / DRAG TO ADJUST
      </div>
    </motion.div>
  );
};

export default Phase2EngagementGrid;
export { EngagementPhase, calculateActivePhase, calculateCost };