import React, { useRef, useEffect, useMemo } from 'react';

const HexLayer = ({ 
  hexes = [], 
  leylines = [], 
  cellSize = 30, 
  width = 800, 
  height = 600, 
  activeLayers = ['Terrain', 'Political', 'Leylines'] 
}) => {
  const canvasRef = useRef(null);
  const SQRT3 = Math.sqrt(3);

  const getHexCoords = (q, r, size) => {
    const x = size * (3/2 * q);
    const y = size * (SQRT3/2 * q + SQRT3 * r);
    return { x, y };
  };

  const getHexPoints = (x, y, size) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle_deg = 60 * i;
      const angle_rad = (Math.PI / 180) * angle_deg;
      points.push({
        x: x + size * Math.cos(angle_rad),
        y: y + size * Math.sin(angle_rad)
      });
    }
    return points;
  };

  const drawHex = (ctx, x, y, size, fill, stroke, lineWidth = 1) => {
    const points = getHexPoints(x, y, size);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    hexes.forEach(hex => {
      const { x, y } = getHexCoords(hex.q, hex.r, cellSize);
      
      if (activeLayers.includes('Terrain')) {
        const terrainColors = {
          mountains: '#4B4B4B',
          forest: '#228B22',
          water: '#1E90FF',
          plains: '#90EE90',
          desert: '#EDC9AF'
        };
        drawHex(ctx, x, y, cellSize, terrainColors[hex.terrain] || '#EEE', null);
      }

      if (activeLayers.includes('Political')) {
        if (hex.ownerColor) {
          ctx.globalAlpha = 0.4;
          drawHex(ctx, x, y, cellSize - 2, hex.ownerColor, hex.borderColor || '#000', 2);
          ctx.globalAlpha = 1.0;
        }
      }
    });
  }, [hexes, cellSize, width, height, activeLayers]);

  const renderedLeylines = useMemo(() => {
    if (!activeLayers.includes('Leylines')) return null;

    return leylines.map((line, idx) => {
      const start = getHexCoords(line.start.q, line.start.r, cellSize);
      const end = getHexCoords(line.end.q, line.end.r, cellSize);
      
      return (
        <g key={`leyline-${idx}`}>
          <path
            d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
            fill="none"
            stroke="rgba(0, 255, 255, 0.6)"
            strokeWidth="3"
            strokeDasharray="10, 5"
            className="leyline-path"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="100"
              to="0"
              dur="3s"
              repeatCount="indefinite"
            />
          </path>
          <circle cx={start.x} cy={start.y} r="5" fill="#00FFFF">
            <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={end.x} cy={end.y} r="5" fill="#00FFFF">
            <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
      );
    });
  }, [leylines, cellSize, activeLayers]);

  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden', background: '#0a0a0c' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
      />
      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 2, pointerEvents: 'none' }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow)">
          {renderedLeylines}
        </g>
      </svg>
    </div>
  );
};

export default HexLayer;