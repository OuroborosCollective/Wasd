import React, { useRef, useEffect, useMemo } from 'react';

interface ResonanceChunk {
  aggression_avg: number;
  faith_avg: number;
}

interface ResonanceHeatmapProps {
  matrix: ResonanceChunk[][]; // Erwartet ein 64x64 Array
  width?: number;
  height?: number;
}

/**
 * ResonanceHeatmap
 * Visualisiert soziale Spannungsfelder der TraitResonanceEngine.
 * Rot-Kanal: Aggression_avg (Spannung/Konflikt)
 * Blau-Kanal: Faith_avg (Kohäsion/Glaube)
 * Die Darstellung nutzt Canvas-Blur und additive Mischung für atmosphärische Strömungen.
 */
export const ResonanceHeatmap: React.FC<ResonanceHeatmapProps> = ({
  matrix,
  width = 512,
  height = 512
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(undefined);

  const gridSize = 64;

  // Offscreen Canvas für das Roh-Raster (Performance-Optimierung)
  const offscreenCanvas = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = gridSize;
    canvas.height = gridSize;
    return canvas;
  }, []);

  const draw = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !offscreenCanvas || !matrix || matrix.length < gridSize) return;

    const ctx = canvas.getContext('2d');
    const offCtx = offscreenCanvas.getContext('2d');
    if (!ctx || !offCtx) return;

    // 1. Daten in das 64x64 Raster schreiben
    const imgData = offCtx.createImageData(gridSize, gridSize);
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const chunk = matrix[y]?.[x] || { aggression_avg: 0, faith_avg: 0 };
        const i = (y * gridSize + x) * 4;
        
        // Dynamische Farbkanäle
        const r = Math.min(255, Math.floor(chunk.aggression_avg * 255));
        const b = Math.min(255, Math.floor(chunk.faith_avg * 255));
        const g = Math.floor((r + b) / 6); // Subtiler Resonanz-Glow

        imgData.data[i] = r;
        imgData.data[i + 1] = g;
        imgData.data[i + 2] = b;
        imgData.data[i + 3] = 255;
      }
    }
    offCtx.putImageData(imgData, 0, 0);

    // 2. Haupt-Canvas Rendering mit atmosphärischen Effekten
    ctx.clearRect(0, 0, width, height);
    
    // Hintergrund-Tiefe
    ctx.fillStyle = '#02040a';
    ctx.fillRect(0, 0, width, height);

    // Pulsierende Strömung berechnen
    const pulse = Math.sin(time * 0.001) * 5;
    
    // Layer 1: Weiche Basis-Strömung
    ctx.save();
    ctx.filter = `blur(${8 + pulse}px) saturate(1.5)`;
    ctx.globalAlpha = 0.6;
    ctx.drawImage(offscreenCanvas, 0, 0, gridSize, gridSize, -10, -10, width + 20, height + 20);
    ctx.restore();

    // Layer 2: Struktur-Details
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(2px)';
    ctx.globalAlpha = 0.8;
    ctx.drawImage(offscreenCanvas, 0, 0, gridSize, gridSize, 0, 0, width, height);
    ctx.restore();

    // Layer 3: Interferenz-Glow (bewegt sich leicht)
    const driftX = Math.sin(time * 0.0005) * 15;
    const driftY = Math.cos(time * 0.0007) * 15;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = 'blur(20px) brightness(1.2)';
    ctx.globalAlpha = 0.3;
    ctx.drawImage(offscreenCanvas, 0, 0, gridSize, gridSize, driftX, driftY, width, height);
    ctx.restore();

    animationRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [matrix, width, height]);

  return (
    <div style={{
      position: 'relative',
      width,
      height,
      overflow: 'hidden',
      borderRadius: '12px',
      boxShadow: '0 0 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.5)',
      border: '1px solid rgba(255,255,255,0.05)'
    }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          display: 'block',
          imageRendering: 'pixelated'
        }}
      />
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        color: 'rgba(255,255,255,0.4)',
        fontSize: '10px',
        fontFamily: 'monospace',
        pointerEvents: 'none',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}>
        Resonance Engine Map // 64x64 Matrix
      </div>
    </div>
  );
};

export default ResonanceHeatmap;