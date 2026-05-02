import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SocketService } from '../../services/SocketService';

interface ArtBoardProps {
    width?: number;
    height?: number;
    pixelSize?: number;
}

const ArtBoard: React.FC<ArtBoardProps> = ({
    width = 64,
    height = 64,
    pixelSize = 10
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [grid, setGrid] = useState<string[]>(new Array(width * height).fill('#ffffff'));
    const socketService = SocketService.getInstance();

    const drawGrid = useCallback((ctx: CanvasRenderingContext2D, currentGrid: string[]) => {
        ctx.clearRect(0, 0, width * pixelSize, height * pixelSize);
        for (let i = 0; i < currentGrid.length; i++) {
            const x = (i % width) * pixelSize;
            const y = Math.floor(i / width) * pixelSize;
            ctx.fillStyle = currentGrid[i];
            ctx.fillRect(x, y, pixelSize, pixelSize);
            
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x, y, pixelSize, pixelSize);
        }
    }, [width, height, pixelSize]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                drawGrid(ctx, grid);
            }
        }
    }, [grid, drawGrid]);

    useEffect(() => {
        socketService.connect();
        
        socketService.on('init_grid', (data: string[]) => {
            setGrid(data);
        });

        socketService.on('update_pixel', (data: { index: number; color: string }) => {
            setGrid(prev => {
                const next = [...prev];
                next[data.index] = data.color;
                return next;
            });
        });

        return () => {
            socketService.disconnect();
        };
    }, [socketService]);

    const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / pixelSize);
        const y = Math.floor((event.clientY - rect.top) / pixelSize);
        
        if (x >= 0 && x < width && y >= 0 && y < height) {
            const index = y * width + x;
            const newColor = '#000000'; 

            socketService.emit('draw_pixel', { index, color: newColor });
            
            setGrid(prev => {
                const next = [...prev];
                next[index] = newColor;
                return next;
            });
        }
    };

    return (
        <div className="artboard-container" style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <canvas
                ref={canvasRef}
                width={width * pixelSize}
                height={height * pixelSize}
                onClick={handleCanvasClick}
                style={{
                    border: '1px solid #ccc',
                    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                    cursor: 'crosshair',
                    imageRendering: 'pixelated'
                }}
            />
        </div>
    );
};

export default ArtBoard;