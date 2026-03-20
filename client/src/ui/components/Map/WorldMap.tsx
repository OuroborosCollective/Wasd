/**
 * WorldMap Component
 * Displays world map with zoom, markers, and navigation
 * 
 * Features:
 * - Canvas-based rendering
 * - Zoom in/out controls
 * - Player position marker
 * - NPC markers
 * - Quest markers
 * - Landmark markers
 * - Minimap
 * - Responsive design
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import './WorldMap.css';

export interface Vector3 {
  x: number;
  y: number;
  z?: number;
}

export interface NPC {
  id: string;
  name: string;
  position: Vector3;
  type: 'merchant' | 'quest' | 'boss' | 'friendly' | 'hostile';
  icon?: string;
}

export interface Quest {
  id: string;
  name: string;
  location: Vector3;
  status: 'active' | 'available' | 'completed';
}

export interface Landmark {
  id: string;
  name: string;
  position: Vector3;
  type: 'city' | 'dungeon' | 'tower' | 'shrine' | 'camp';
  icon?: string;
}

interface WorldMapProps {
  playerPosition: Vector3;
  npcs?: NPC[];
  quests?: Quest[];
  landmarks?: Landmark[];
  mapWidth?: number;
  mapHeight?: number;
  onLocationClick?: (location: Vector3) => void;
  className?: string;
}

/**
 * Map Canvas Component
 */
const MapCanvas: React.FC<{
  playerPosition: Vector3;
  npcs: NPC[];
  quests: Quest[];
  landmarks: Landmark[];
  zoom: number;
  offset: Vector3;
  mapWidth: number;
  mapHeight: number;
  onLocationClick?: (location: Vector3) => void;
}> = ({
  playerPosition,
  npcs,
  quests,
  landmarks,
  zoom,
  offset,
  mapWidth,
  mapHeight,
  onLocationClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
    ctx.fillRect(0, 0, mapWidth, mapHeight);

    // Draw grid
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 50 * zoom;

    for (let x = 0; x < mapWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, mapHeight);
      ctx.stroke();
    }

    for (let y = 0; y < mapHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(mapWidth, y);
      ctx.stroke();
    }

    // Helper function to convert world coordinates to canvas coordinates
    const worldToCanvas = (pos: Vector3): { x: number; y: number } => {
      return {
        x: (pos.x - offset.x) * zoom + mapWidth / 2,
        y: (pos.y - offset.y) * zoom + mapHeight / 2
      };
    };

    // Draw landmarks
    landmarks.forEach((landmark) => {
      const canvasPos = worldToCanvas(landmark.position);
      if (canvasPos.x >= 0 && canvasPos.x <= mapWidth && canvasPos.y >= 0 && canvasPos.y <= mapHeight) {
        // Landmark circle
        ctx.fillStyle = 'rgba(100, 150, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(canvasPos.x, canvasPos.y, 8 * zoom, 0, Math.PI * 2);
        ctx.fill();

        // Landmark border
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Landmark label
        ctx.fillStyle = '#6b9fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(landmark.name, canvasPos.x, canvasPos.y + 16);
      }
    });

    // Draw NPCs
    npcs.forEach((npc) => {
      const canvasPos = worldToCanvas(npc.position);
      if (canvasPos.x >= 0 && canvasPos.x <= mapWidth && canvasPos.y >= 0 && canvasPos.y <= mapHeight) {
        // NPC color based on type
        const colors: Record<string, string> = {
          merchant: 'rgba(255, 215, 0, 0.5)',
          quest: 'rgba(100, 200, 100, 0.5)',
          boss: 'rgba(255, 100, 100, 0.5)',
          friendly: 'rgba(100, 200, 100, 0.5)',
          hostile: 'rgba(255, 100, 100, 0.5)'
        };

        ctx.fillStyle = colors[npc.type] || 'rgba(100, 150, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(canvasPos.x, canvasPos.y, 6 * zoom, 0, Math.PI * 2);
        ctx.fill();

        // NPC border
        ctx.strokeStyle = colors[npc.type]?.replace('0.5', '1') || 'rgba(100, 150, 255, 1)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // NPC label
        ctx.fillStyle = '#fff';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(npc.name, canvasPos.x, canvasPos.y + 14);
      }
    });

    // Draw quests
    quests.forEach((quest) => {
      const canvasPos = worldToCanvas(quest.location);
      if (canvasPos.x >= 0 && canvasPos.x <= mapWidth && canvasPos.y >= 0 && canvasPos.y <= mapHeight) {
        const colors: Record<string, string> = {
          active: 'rgba(255, 215, 0, 0.6)',
          available: 'rgba(100, 150, 255, 0.6)',
          completed: 'rgba(100, 200, 100, 0.6)'
        };

        ctx.fillStyle = colors[quest.status] || 'rgba(100, 150, 255, 0.6)';
        ctx.beginPath();
        ctx.rect(canvasPos.x - 5 * zoom, canvasPos.y - 5 * zoom, 10 * zoom, 10 * zoom);
        ctx.fill();

        // Quest border
        ctx.strokeStyle = colors[quest.status]?.replace('0.6', '1') || 'rgba(100, 150, 255, 1)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Quest label
        ctx.fillStyle = '#fff';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(quest.name, canvasPos.x, canvasPos.y + 12);
      }
    });

    // Draw player
    const playerCanvasPos = worldToCanvas(playerPosition);
    ctx.fillStyle = 'rgba(100, 150, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(playerCanvasPos.x, playerCanvasPos.y, 8 * zoom, 0, Math.PI * 2);
    ctx.fill();

    // Player border
    ctx.strokeStyle = '#6b9fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Player direction indicator
    ctx.fillStyle = '#6b9fff';
    ctx.beginPath();
    ctx.moveTo(playerCanvasPos.x, playerCanvasPos.y - 10 * zoom);
    ctx.lineTo(playerCanvasPos.x - 4 * zoom, playerCanvasPos.y + 4 * zoom);
    ctx.lineTo(playerCanvasPos.x + 4 * zoom, playerCanvasPos.y + 4 * zoom);
    ctx.fill();

    // Player label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('You', playerCanvasPos.x, playerCanvasPos.y + 18);
  }, [playerPosition, npcs, quests, landmarks, zoom, offset, mapWidth, mapHeight]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert canvas coordinates back to world coordinates
    const worldX = (x - mapWidth / 2) / zoom + offset.x;
    const worldY = (y - mapHeight / 2) / zoom + offset.y;

    onLocationClick?.({ x: worldX, y: worldY });
  };

  return (
    <canvas
      ref={canvasRef}
      width={mapWidth}
      height={mapHeight}
      className="map-canvas"
      onClick={handleCanvasClick}
      style={{ cursor: 'crosshair' }}
    />
  );
};

/**
 * Zoom Controls Component
 */
const ZoomControls: React.FC<{
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}> = ({ zoom, onZoomIn, onZoomOut, onResetZoom }) => {
  return (
    <div className="zoom-controls">
      <button className="zoom-btn zoom-in" onClick={onZoomIn} title="Zoom In">
        +
      </button>
      <div className="zoom-level">{(zoom * 100).toFixed(0)}%</div>
      <button className="zoom-btn zoom-out" onClick={onZoomOut} title="Zoom Out">
        −
      </button>
      <button className="zoom-btn reset" onClick={onResetZoom} title="Reset Zoom">
        ⊙
      </button>
    </div>
  );
};

/**
 * Map Legend Component
 */
const MapLegend: React.FC = () => {
  return (
    <div className="map-legend">
      <div className="legend-title">Legend</div>
      <div className="legend-items">
        <div className="legend-item">
          <div className="legend-marker player" />
          <span>Player</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker landmark" />
          <span>Landmark</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker npc-quest" />
          <span>Quest NPC</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker npc-merchant" />
          <span>Merchant</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker quest-active" />
          <span>Active Quest</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker quest-available" />
          <span>Available Quest</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Main WorldMap Component
 */
export const WorldMap: React.FC<WorldMapProps> = ({
  playerPosition,
  npcs = [],
  quests = [],
  landmarks = [],
  mapWidth = 500,
  mapHeight = 400,
  onLocationClick,
  className = ''
}) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Vector3>({ x: playerPosition.x, y: playerPosition.y });

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.2, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setOffset({ x: playerPosition.x, y: playerPosition.y });
  }, [playerPosition]);

  // Update offset to follow player
  useEffect(() => {
    setOffset({ x: playerPosition.x, y: playerPosition.y });
  }, [playerPosition]);

  return (
    <div className={`world-map-container ${className}`}>
      <div className="map-header">
        <h2 className="map-title">World Map</h2>
      </div>

      <div className="map-content">
        <MapCanvas
          playerPosition={playerPosition}
          npcs={npcs}
          quests={quests}
          landmarks={landmarks}
          zoom={zoom}
          offset={offset}
          mapWidth={mapWidth}
          mapHeight={mapHeight}
          onLocationClick={onLocationClick}
        />

        <ZoomControls
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
        />

        <MapLegend />
      </div>
    </div>
  );
};

export default WorldMap;
