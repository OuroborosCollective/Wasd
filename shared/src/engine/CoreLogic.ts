export interface IKappaPos {
    x: number;
    y: number;
    phase: number;
}

export interface IEntity {
    id: string;
    position: IKappaPos;
    velocity: { vx: number; vy: number; vPhase: number };
    mass: number;
    metadata: Record<string, any>;
}

export interface IWorldState {
    tick: number;
    entities: Map<string, IEntity>;
    config: {
        gravity: number;
        friction: number;
        boundarySize: number;
    };
}

export interface ISimulationResult {
    previousState: IWorldState;
    newState: IWorldState;
    events: Array<{ type: string; payload: any }>;
}

export class CoreLogic {
    public static readonly PI_2 = Math.PI * 2;

    public static createKappaPos(x: number, y: number, phase: number = 0): IKappaPos {
        return {
            x,
            y,
            phase: this.normalizePhase(phase)
        };
    }

    public static normalizePhase(phase: number): number {
        const p = phase % this.PI_2;
        return p < 0 ? p + this.PI_2 : p;
    }

    public static calculateDistance(a: IKappaPos, b: IKappaPos): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    public static step(state: IWorldState, deltaTime: number): IWorldState {
        const nextEntities = new Map<string, IEntity>();

        state.entities.forEach((entity, id) => {
            const nextEntity = this.updateEntity(entity, state, deltaTime);
            nextEntities.set(id, nextEntity);
        });

        return {
            tick: state.tick + 1,
            entities: nextEntities,
            config: { ...state.config }
        };
    }

    private static updateEntity(entity: IEntity, state: IWorldState, dt: number): IEntity {
        let nx = entity.position.x + entity.velocity.vx * dt;
        let ny = entity.position.y + entity.velocity.vy * dt;
        let nPhase = entity.position.phase + entity.velocity.vPhase * dt;

        let nvx = entity.velocity.vx * (1 - state.config.friction * dt);
        let nvy = entity.velocity.vy * (1 - state.config.friction * dt);
        let nvPhase = entity.velocity.vPhase;

        if (Math.abs(nx) > state.config.boundarySize) {
            nvx *= -1;
            nx = Math.sign(nx) * state.config.boundarySize;
        }
        if (Math.abs(ny) > state.config.boundarySize) {
            nvy *= -1;
            ny = Math.sign(ny) * state.config.boundarySize;
        }

        return {
            ...entity,
            position: {
                x: nx,
                y: ny,
                phase: this.normalizePhase(nPhase)
            },
            velocity: {
                vx: nvx,
                vy: nvy,
                vPhase: nvPhase
            }
        };
    }

    public static interpolate(start: IKappaPos, end: IKappaPos, alpha: number): IKappaPos {
        return {
            x: start.x + (end.x - start.x) * alpha,
            y: start.y + (end.y - start.y) * alpha,
            phase: this.interpolatePhase(start.phase, end.phase, alpha)
        };
    }

    private static interpolatePhase(p1: number, p2: number, alpha: number): number {
        let diff = p2 - p1;
        if (diff > Math.PI) diff -= this.PI_2;
        if (diff < -Math.PI) diff += this.PI_2;
        return this.normalizePhase(p1 + diff * alpha);
    }
}

export abstract class LivingWorld {
    protected currentState: IWorldState;

    constructor(initialState: IWorldState) {
        this.currentState = initialState;
    }

    public abstract onTick(state: IWorldState): void;

    public update(deltaTime: number): ISimulationResult {
        const previousState = this.currentState;
        const newState = CoreLogic.step(previousState, deltaTime);
        
        this.onTick(newState);
        this.currentState = newState;

        return {
            previousState,
            newState,
            events: []
        };
    }

    public getState(): IWorldState {
        return this.currentState;
    }
}