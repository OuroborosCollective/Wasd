/**
 * EchoTracker - Quest Beacon Dashboard
 * 
 * Live display of active quest beacons with physical indicators.
 * Processes intensities per Engine specs:
 * - Combat: 0.95
 * - Collect: 0.80
 * - Talk_to: 0.70
 * 
 * Optimized for 10-Hz ticks:
 * - Object pooling to prevent memory leaks
 * - Deterministic payload parsing
 * - ZeroGC design
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

/** Beacon intensity (Engine specs) */
export interface BeaconIntensity {
  type: 'COMBAT' | 'COLLECT' | 'TALK_TO';
  intensity: number;
  label: string;
  position: { x: number; y: number };
}

/** Signal wave result */
export interface SignalWaveResult {
  label: string;
  css: string;
  indicator: PhysicalIndicator;
}

/** Physical indicator for web portal */
export interface PhysicalIndicator {
  size: number;
  color: string;
  pulseRate: number;
  glowIntensity: number;
}

/** Quest beacon data */
interface QuestBeacon {
  id: string;
  type: string;
  intensity: number;
  timestamp: number;
  region: string;
}

/** Pooled beacon object (reused) */
class PooledBeacon {
  id = '';
  type = 'COMBAT';
  intensity = 0;
  timestamp = 0;
  region = '';
  next: PooledBeacon | null = null;
}

/** Object pool for beacons - prevents memory leaks at 10-Hz */
class BeaconPool {
  private pool: PooledBeacon[] = [];
  private readonly poolSize = 50;
  private head = 0;

  constructor() {
    for (let i = 0; i < this.poolSize; i++) {
      this.pool.push(new PooledBeacon());
    }
  }

  allocate(): PooledBeacon {
    if (this.head >= this.poolSize) {
      this.head = 0;
    }
    return this.pool[this.head++];
  }

  reset(): void {
    this.head = 0;
  }
}

/** Intensity mapping per Engine specs */
const INTENSITY_MAP: Record<string, number> = {
  COMBAT: 0.95,
  COLLECT: 0.80,
  TALK_TO: 0.70
};

/** Integer scale */
const INT_SCALE = 10000;

/** Tick rate */
const TICK_RATE_MS = 100;

/**
 * Parse deterministic payload.
 * Returns beacon data from raw payload.
 */
export function parseBeaconPayload(payload: string): QuestBeacon | null {
  if (!payload || payload.length === 0) return null;
  
  try {
    // Deterministic parse without JSON overhead
    const parts = payload.split('|');
    if (parts.length < 2) return null;
    
    return {
      id: parts[0] || '',
      type: parts[1] || 'COMBAT',
      intensity: INTENSITY_MAP[parts[1]] || 0.1,
      timestamp: Date.now(),
      region: parts[2] || 'unknown'
    };
  } catch {
    return null;
  }
}

/**
 * Get signal strength per Engine specs.
 */
export function getSignalStrength(questType: string): number {
  const normalizedType = questType.toUpperCase();
  return INTENSITY_MAP[normalizedType] ?? 0.1;
}

/**
 * Convert intensity to physical indicator.
 */
export function toPhysicalIndicator(intensity: number): PhysicalIndicator {
  const size = Math.floor(50 + (intensity * 100));
  const color = intensity >= 0.95 ? '#ff3333' 
              : intensity >= 0.80 ? '#ff9900' 
              : '#33ff99';
  const pulseRate = Math.floor(2000 / (1 + intensity * 10));
  const glowIntensity = Math.floor(intensity * INT_SCALE);
  
  return { size, color, pulseRate, glowIntensity };
}

/**
 * Render signal wave for display.
 */
export function renderSignalWave(type: string, strength: number): SignalWaveResult {
  const percentage = Math.round(strength * 100);
  const indicator = toPhysicalIndicator(strength);
  
  return {
    label: `${type.toUpperCase()} (${percentage}%)`,
    css: `opacity: ${strength}; transform: scale(${1 + strength}); animation-duration: ${indicator.pulseRate}ms;`,
    indicator
  };
}

/**
 * Main Dashboard Component
 */
const EchoTracker: React.FC = () => {
  const [beacons, setBeacons] = useState<QuestBeacon[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const beaconPool = useRef(new BeaconPool());
  const tickInterval = useRef<NodeJS.Timeout | null>(null);

  // Process tick - optimized for 10-Hz
  const processTick = useCallback(() => {
    // Simulate incoming beacons (in production, this would be WebSocket data)
    const mockPayloads = [
      `beacon_1|COMBAT|${Date.now()}|northern`,
      `beacon_2|COLLECT|${Date.now()}|western`,
      `beacon_3|TALK_TO|${Date.now()}|eastern`
    ];
    
    const newBeacons: QuestBeacon[] = [];
    for (const payload of mockPayloads) {
      const beacon = parseBeaconPayload(payload);
      if (beacon) {
        // Reuse pooled object
        const pooled = beaconPool.current.allocate();
        Object.assign(pooled, beacon);
        newBeacons.push(pooled as unknown as QuestBeacon);
      }
    }
    
    setBeacons(newBeacons);
  }, []);

  // Connect and start 10-Hz tick
  useEffect(() => {
    setIsConnected(true);
    tickInterval.current = setInterval(processTick, TICK_RATE_MS);
    
    return () => {
      if (tickInterval.current) {
        clearInterval(tickInterval.current);
      }
      beaconPool.current.reset();
    };
  }, [processTick]);

  // Render all beacons with physical indicators
  const renderedBeacons = useMemo(() => {
    return beacons.map(beacon => {
      const signal = renderSignalWave(beacon.type, beacon.intensity);
      return {
        ...beacon,
        ...signal
      };
    });
  }, [beacons]);

  if (!isConnected) {
    return <div className="echo-tracker loading">Connecting to beacon network...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>QUEST BEACON DASHBOARD</div>
        <div style={styles.status}>
          <span style={styles.statusDot}></span>
          LIVE ({renderedBeacons.length} active)
        </div>
      </div>

      <div style={styles.grid}>
        {renderedBeacons.map((beacon, i) => (
          <div key={beacon.id || i} style={styles.beaconCard}>
            <div style={{
              ...styles.beaconIndicator,
              width: beacon.indicator.size,
              height: beacon.indicator.size,
              backgroundColor: beacon.indicator.color,
              boxShadow: `0 0 ${beacon.indicator.glowIntensity / 100}px ${beacon.indicator.color}`,
              animationDuration: `${beacon.indicator.pulseRate}ms`
            }}></div>
            <div style={styles.beaconInfo}>
              <div style={styles.beaconType}>{beacon.type}</div>
              <div style={styles.beaconLabel}>{beacon.label}</div>
              <div style={styles.beaconRegion}>{beacon.region}</div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        .beacon-pulse { animation: pulse 2s infinite; }
      `}</style>
    </div>
  );
};

/** Inline styles */
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    backgroundColor: '#0a0a0a',
    color: '#e0e0e0',
    fontFamily: "'Courier New', monospace",
    minHeight: '400px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '1px solid #333'
  },
  title: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#33ff99',
    letterSpacing: '2px'
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#888'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#33ff99',
    boxShadow: '0 0 8px #33ff99'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '15px'
  },
  beaconCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '15px',
    backgroundColor: '#111',
    borderRadius: '8px',
    border: '1px solid #333'
  },
  beaconIndicator: {
    borderRadius: '50%',
    animation: 'pulse 2s infinite'
  },
  beaconInfo: {
    flex: 1
  },
  beaconType: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff'
  },
  beaconLabel: {
    fontSize: '12px',
    color: '#888'
  },
  beaconRegion: {
    fontSize: '10px',
    color: '#555'
  }
};

export default EchoTracker;
