export interface KappaPos {
    x: number;
    y: number;
    id: string;
    radius?: number;
    color?: string;
    opacity?: number;
}

export class OuroborosRenderer {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = this.canvas.getContext('2d', { alpha: true });
        
        if (!context) {
            throw new Error('Failed to initialize 2D context');
        }
        
        this.ctx = context;
        this.ctx.imageSmoothingEnabled = true;
    }

    public render(positions: KappaPos[]): void {
        this.clear();
        this.drawLayer(positions);
    }

    private clear(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    private drawLayer(entities: KappaPos[]): void {
        const len = entities.length;
        for (let i = 0; i < len; i++) {
            const entity = entities[i];
            this.drawEntity(entity);
        }
    }

    private drawEntity(entity: KappaPos): void {
        this.ctx.save();
        
        const radius = entity.radius || 5;
        const color = entity.color || '#00FF41';
        const opacity = entity.opacity !== undefined ? entity.opacity : 1.0;

        this.ctx.globalAlpha = opacity;
        this.ctx.beginPath();
        this.ctx.arc(entity.x, entity.y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        
        // Glow effect for engine visualization
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = color;
        
        this.ctx.restore();
    }

    public resize(width: number, height: number): void {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.ctx.scale(dpr, dpr);
    }

    public getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }
}