import React, { useState, useEffect, useMemo } from 'react';
import WikiPortal from './components/WikiPortal';

/**
 * ARCHITEKTUR-KOMPONENTE: Plexity Gate
 * Das Plexity Gate steuert die Rendering-Komplexität basierend auf der Hardware-Leistung.
 */

interface EntityConfig {
  id: string;
  modelPath: string;
  complexityLevel: number;
}

export const computePlexity = (score: number): number => {
  if (score < 0.3) return 1;
  if (score < 0.7) return 10;
  return 1000;
};

export const loadEntity = (id: string, score: number): EntityConfig => {
  const plexity = computePlexity(score);
  const basePath = `/assets/models/${id}`;

  if (plexity === 1) {
    return { id, modelPath: `${basePath}/proxy.glb`, complexityLevel: 1 };
  } else if (plexity === 10) {
    return { id, modelPath: `${basePath}/standard.glb`, complexityLevel: 10 };
  } else {
    return { id, modelPath: `${basePath}/high_poly.glb`, complexityLevel: 1000 };
  }
};

const estimateDeviceScore = (): number => {
  if (typeof window === 'undefined') return 0.5;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as any).deviceMemory || 4;
  const rawScore = (cores * memory) / 64; 
  return Math.min(Math.max(rawScore, 0), 1);
};

const App: React.FC = () => {
  const [showWiki, setShowWiki] = useState<boolean>(true);
  const [deviceScore, setDeviceScore] = useState<number>(0.5);
  
  useEffect(() => {
    const score = estimateDeviceScore();
    setDeviceScore(score);
  }, []);

  const currentPlexity = useMemo(() => computePlexity(deviceScore), [deviceScore]);
  const worldAvatar = useMemo(() => loadEntity('player_base', deviceScore), [deviceScore]);

  if (showWiki) {
    return (
      <WikiPortal onClose={() => setShowWiki(false)} />
    );
  }

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: '#0a0a0a', 
      color: '#e0e0e0', 
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <header style={{ 
        padding: '20px', 
        borderBottom: '1px solid #222', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '2px' }}>
          ARELORIA <span style={{ color: '#4f46e5' }}>WASD</span>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button
            onClick={() => setShowWiki(true)}
            style={{ padding: '8px 16px', background: '#FFD700', color: 'black', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            OPEN_WIKI
          </button>
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>PLEXITY GATE STATUS</div>
            <div style={{
              color: currentPlexity === 1000 ? '#10b981' : currentPlexity === 10 ? '#3b82f6' : '#f59e0b',
              fontWeight: 'mono'
            }}>
              LEVEL: {currentPlexity} | SCORE: {deviceScore.toFixed(2)}
            </div>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        <div style={{ 
          padding: '40px', 
          borderRadius: '12px', 
          background: 'rgba(255,255,255,0.03)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: '500px'
        }}>
          <h2 style={{ marginTop: 0 }}>System Initialized</h2>
          <p>Das Metaverse wird für Ihre Hardware optimiert...</p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '10px' }}>
              <strong>Active Model Path:</strong> <code style={{ color: '#a78bfa' }}>{worldAvatar.modelPath}</code>
            </li>
            <li>
              <strong>Render Strategy:</strong> {
                currentPlexity === 1000 ? 'Raytraced / Ultra High Poly' : 
                currentPlexity === 10 ? 'Standard PBR / Dynamic LOD' : 
                'Proxy Geometry / Flat Shading'
              }
            </li>
          </ul>
        </div>
      </main>

      <footer style={{ padding: '10px 20px', fontSize: '0.7rem', opacity: 0.4, borderTop: '1px solid #222' }}>
        Sovereign Studio Design-Coder | Core Engine v4.0.1 | Hybrid Node.js/Python Backend Integration
      </footer>
    </div>
  );
};

export default App;
