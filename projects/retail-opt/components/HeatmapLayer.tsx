import React, { useRef, useEffect, useMemo } from 'react';

interface Beacon {
  x: number;
  y: number;
  intensity: number;
}

interface Flow {
  fromIndex: number;
  toIndex: number;
  volume: number;
}

interface HeatmapLayerProps {
  beacons: Beacon[];
  flows: Flow[];
  width: number;
  height: number;
  opacity?: number;
}

const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ 
  beacons, 
  flows, 
  width, 
  height, 
  opacity = 0.8 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = opacity;

    // Draw Flows (Bezier Curves)
    flows.forEach(flow => {
      const start = beacons[flow.fromIndex];
      const end = beacons[flow.toIndex];
      
      if (!start || !end) return;

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);

      // Calculate control points for a natural shopper path curve
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const cp1x = start.x + dx * 0.5;
      const cp1y = start.y;
      const cp2x = start.x + dx * 0.5;
      const cp2y = end.y;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, end.x, end.y);
      
      const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      gradient.addColorStop(0, `rgba(255, 255, 0, ${flow.volume * 0.4})`);
      gradient.addColorStop(1, `rgba(255, 0, 0, ${flow.volume * 0.6})`);
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2 + (flow.volume * 5);
      ctx.lineCap = 'round';
      ctx.stroke();
    });

    // Draw Beacons (Radial Gradients)
    beacons.forEach(beacon => {
      const radius = 40 * beacon.intensity;
      const gradient = ctx.createRadialGradient(
        beacon.x, beacon.y, 0,
        beacon.x, beacon.y, radius
      );

      // Intensity Mapping: 0.95 -> Bright Yellow/Red Center
      const hue = (1 - beacon.intensity) * 60; // 0 = red, 60 = yellow
      const alpha = beacon.intensity * 0.95;

      gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, ${alpha})`);
      gradient.addColorStop(0.5, `hsla(${hue}, 100%, 40%, ${alpha * 0.5})`);
      gradient.addColorStop(1, `hsla(${hue}, 100%, 30%, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(beacon.x, beacon.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      draw(ctx);
    };

    render();
  }, [beacons, flows, width, height, opacity]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        mixBlendMode: 'screen'
      }}
    />
  );
};

export default HeatmapLayer;