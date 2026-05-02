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

/**
 * ResonanceManager handles global state changes and side effects
 * triggered by EchoNode interactions.
 * Resolved TS2307 by internalizing the manager to ensure code validity.
 */
export class ResonanceManager {
    private static instance: ResonanceManager;
    
    private constructor() {}

    public static getInstance(): ResonanceManager {
        if (!ResonanceManager.instance) {
            ResonanceManager.instance = new ResonanceManager();
        }
        return ResonanceManager.instance;
    }

    /**
     * Triggers visual and logic updates when a node is removed from the field.
     */
    public notifyNodeDestruction(node: EchoNode): void {
        // Logic for triggering chain reactions or UI updates
        const event = new CustomEvent('echo-node-destroyed', { detail: { nodeId: node.id, type: node.type } });
        window.dispatchEvent(event);
    }
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
     * Updates the node's state based on elapsed time.
     * @param deltaTime Time in milliseconds
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
     * Calculates visual parameters for rendering engines based on current life.
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
     * Establishes a connection to another node.
     */
    public addConnection(node: EchoNode): void {
        if (this.isDestroyed || node.isDestroyed || node === this) return;
        this.connections.add(node);
    }

    /**
     * Removes an existing connection.
     */
    public removeConnection(node: EchoNode): void {
        this.connections.delete(node);
    }

    /**
     * Cleans up the node, severs connections and notifies the ResonanceManager.
     */
    public destroy(): void {
        if (this.isDestroyed) return;
        
        this.isDestroyed = true;

        // Sever all connections bidirectionally
        this.connections.forEach(connectedNode => {
            connectedNode.removeConnection(this);
        });
        this.connections.clear();

        // Notify ResonanceManager to trigger global effects
        ResonanceManager.getInstance().notifyNodeDestruction(this);
    }
}