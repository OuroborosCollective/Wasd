import React, { useRef, useEffect } from 'react';

interface ChunkData {
    x: number;
    y: number;
    flow_intensity: number;
}

interface TrafficResonanceEvent {
    chunks: ChunkData[];
}

// Mocking or assuming global event bus based on requirements
// In a real scenario, this would be imported from a core module
declare const TrafficResonance: {
    on: (event: string, callback: (data: TrafficResonanceEvent) => void) => void;
    off: (event: string, callback: (data: TrafficResonanceEvent) => void) => void;
};

const HeatmapLayer: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const GRID_SIZE = 64;

    const getColor = (intensity: number): string => {
        const hue = (1 - Math.min(Math.max(intensity, 0), 1)) * 240;
        return `hsl(${hue}, 100%, 50%)`;
    };

    const drawHeatmap = (chunks: ChunkData[]) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const cellWidth = canvas.width / GRID_SIZE;
        const cellHeight = canvas.height / GRID_SIZE;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        chunks.forEach((chunk) => {
            ctx.fillStyle = getColor(chunk.flow_intensity);
            ctx.fillRect(
                chunk.x * cellWidth,
                chunk.y * cellHeight,
                cellWidth,
                cellHeight
            );
        });
    };

    useEffect(() => {
        const handleUpdate = (data: TrafficResonanceEvent) => {
            drawHeatmap(data.chunks);
        };

        if (typeof TrafficResonance !== 'undefined') {
            TrafficResonance.on('update', handleUpdate);
        }

        return () => {
            if (typeof TrafficResonance !== 'undefined') {
                TrafficResonance.off('update', handleUpdate);
            }
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            width={512}
            height={512}
            style={{
                width: '100%',
                height: '100%',
                imageRendering: 'pixelated',
                pointerEvents: 'none',
                position: 'absolute',
                top: 0,
                left: 0
            }}
        />
    );
};

export default HeatmapLayer;