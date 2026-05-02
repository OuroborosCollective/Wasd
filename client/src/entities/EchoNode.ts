import { ResonanceManager } from '../core/ResonanceManager';

export enum ElementType {
    PLASMA = 'PLASMA',
    VOID = 'VOID',
    FLUX = 'FLUX',
    STABLE = 'STABLE'
}

export interface EchoNodeData {
    id: string;
    x: number;
    y: number;
    type: ElementType;
    lifespan: number;
}

export class EchoNode {
    public readonly id: string;
    public x: number;
    public y: number;
    public type: ElementType;
    public currentLifespan: number;
    public maxLifespan: number;
    public connections: Set<EchoNode> = new Set();
    public isDestroyed: boolean = false;

    constructor(data: EchoNodeData) {
        this.id = data.id;
        this.x = data.x;
        this.y = data.y;
        this.type = data.type;
        this.maxLifespan = data.lifespan;
        this.currentLifespan = data.lifespan;
    }

    /**
     * Aktualisiert den Zustand der Node basierend auf der vergangenen Zeit.
     * @param deltaTime Zeit in Millisekunden
     */
    public update(deltaTime: number): void {
        if (this.isDestroyed) return;

        this.currentLifespan -= deltaTime;
        
        if (this.currentLifespan <= 0) {
            this.currentLifespan = 0;
            this.destroy();
        }
    }

    /**
     * Berechnet die visuellen Parameter basierend auf der verbleibenden Lebensdauer.
     */
    public getVisualState() {
        const normalizedLife = Math.max(0, this.currentLifespan / this.maxLifespan);
        return {
            opacity: normalizedLife,
            scale: 0.5 + (normalizedLife * 0.5),
            glowIntensity: normalizedLife * 20,
            color: this.getElementColor(),
            pulseRate: this.type === ElementType.FLUX ? (2.0 - normalizedLife) : 1.0
        };
    }

    private getElementColor(): string {
        switch (this.type) {
            case ElementType.PLASMA: return '#ff4500';
            case ElementType.VOID: return '#4b0082';
            case ElementType.FLUX: return '#00ced1';
            case ElementType.STABLE: return '#f5f5f5';
            default: return '#ffffff';
        }
    }

    /**
     * Stellt eine Verbindung zu einer anderen Node her.
     */
    public addConnection(node: EchoNode): void {
        if (this.isDestroyed || node.isDestroyed || node === this) return;
        this.connections.add(node);
    }

    /**
     * Entfernt eine bestehende Verbindung.
     */
    public removeConnection(node: EchoNode): void {
        this.connections.delete(node);
    }

    /**
     * Bereinigt die Node, trennt Verbindungen und informiert das Management-System.
     */
    public destroy(): void {
        if (this.isDestroyed) return;
        
        this.isDestroyed = true;

        // Alle Verbindungen bidirektional kappen
        this.connections.forEach(connectedNode => {
            connectedNode.removeConnection(this);
        });
        this.connections.clear();

        // ResonanceManager über die Zerstörung informieren zur Triggerung von Effekten und State-Updates
        ResonanceManager.getInstance().notifyNodeDestruction(this);
    }
}