export interface TickState {
    entityId: string;
    life: number;
    phase: number;
    positionX: number;
    positionY: number;
    velocityX: number;
    velocityY: number;
    action: ActionType;
}

export interface BattleState {
    tick: number;
    players: Map<string, TickState>;
    projectiles: Map<string, ProjectileState>;
    winner: string | null;
    isComplete: boolean;
}

export interface ProjectileState {
    id: string;
    ownerId: string;
    positionX: number;
    positionY: number;
    velocityX: number;
    velocityY: number;
    damage: number;
    lifeTime: number;
}

export enum ActionType {
    Idle = 0,
    MoveUp = 1,
    MoveDown = 2,
    MoveLeft = 3,
    MoveRight = 4,
    Attack = 5,
    Defend = 6
}

const TICK_REGEX = /^([^|]+)\|li:(\d+)\|ph:(\d+)\|plx:(\d+)(?:\|ply:(\d+))?$/;

const TICK_INTERVAL_MS = 100;
const MAX_PLAYERS = 4;
const ARENA_WIDTH = 768;
const ARENA_HEIGHT = 1024;
const STARTING_LIFE = 100;
const MAX_PHASES = 1800;

export function parseChain(chain: string): TickState | null {
    const match = TICK_REGEX.exec(chain);
    if (!match) return null;
    return {
        entityId: match[1],
        life: parseInt(match[2], 10),
        phase: parseInt(match[3], 10),
        positionX: parseInt(match[4], 10),
        positionY: parseInt(match[5] || '0', 10),
        velocityX: 0,
        velocityY: 0,
        action: ActionType.Idle
    };
}

export function serializeTick(state: TickState): string {
    const parts = [state.entityId, `li:${state.life}`, `ph:${state.phase}`, `plx:${state.positionX}`];
    if (state.positionY !== 0) parts.push(`ply:${state.positionY}`);
    return parts.join('|');
}

export function applyPhysicsTick(state: TickState, velocity: number): TickState {
    let dx = 0, dy = 0;
    switch (state.action) {
        case ActionType.MoveUp: dy = -velocity; break;
        case ActionType.MoveDown: dy = velocity; break;
        case ActionType.MoveLeft: dx = -velocity; break;
        case ActionType.MoveRight: dx = velocity; break;
    }
    return {
        ...state,
        phase: (state.phase + 1) | 0,
        positionX: Math.max(0, Math.min(ARENA_WIDTH, (state.positionX + dx) | 0)),
        positionY: Math.max(0, Math.min(ARENA_HEIGHT, (state.positionY + dy) | 0))
    };
}

export class BattleTick {
    private battleState: BattleState;
    private tickCount: number = 0;
    private tickInterval: ReturnType<typeof setInterval> | null = null;
    private velocity: number = 5;

    constructor() {
        this.battleState = {
            tick: 0,
            players: new Map(),
            projectiles: new Map(),
            winner: null,
            isComplete: false
        };
    }

    public addPlayer(id: string, startX: number = 384, startY: number = 512): void {
        this.battleState.players.set(id, {
            entityId: id,
            life: STARTING_LIFE,
            phase: 0,
            positionX: startX,
            positionY: startY,
            velocityX: 0,
            velocityY: 0,
            action: ActionType.Idle
        });
    }

    public processAction(playerId: string, action: ActionType): void {
        const player = this.battleState.players.get(playerId);
        if (player) player.action = action;
    }

    public processTick(): BattleState {
        this.tickCount++;
        
        for (const player of this.battleState.players.values()) {
            const updated = applyPhysicsTick(player, this.velocity);
            player.positionX = updated.positionX;
            player.positionY = updated.positionY;
            player.phase = updated.phase;
            
            if (player.action === ActionType.Attack) this.processAttack(player);
            if (player.life <= 0) this.battleState.isComplete = true;
        }
        
        this.updateProjectiles();
        this.checkWinCondition();
        this.battleState.tick = this.tickCount;
        
        return this.battleState;
    }

    private processAttack(attacker: TickState): void {
        for (const target of this.battleState.players.values()) {
            if (target.entityId === attacker.entityId) continue;
            const dx = target.positionX - attacker.positionX;
            const dy = target.positionY - attacker.positionY;
            if (Math.sqrt(dx*dx + dy*dy) < 50) {
                target.life = Math.max(0, target.life - 10);
            }
        }
    }

    private updateProjectiles(): void {
        for (const [id, proj] of this.battleState.projectiles) {
            proj.positionX = (proj.positionX + proj.velocityX) | 0;
            proj.positionY = (proj.positionY + proj.velocityY) | 0;
            proj.lifeTime--;
            if (proj.lifeTime <= 0) this.battleState.projectiles.delete(id);
        }
    }

    private checkWinCondition(): void {
        let alive = 0, win: string | null = null;
        for (const p of this.battleState.players.values()) {
            if (p.life > 0) { alive++; win = p.entityId; }
        }
        if (alive <= 1 && alive > 0) { this.battleState.winner = win; this.battleState.isComplete = true; }
        if (this.tickCount >= MAX_PHASES) this.battleState.isComplete = true;
    }

    public getPlayerState(id: string): TickState | undefined {
        return this.battleState.players.get(id);
    }

    public getPlayerChain(id: string): string | null {
        const p = this.battleState.players.get(id);
        return p ? serializeTick(p) : null;
    }

    public getAllChains(): Map<string, string> {
        const m = new Map();
        for (const [id, p] of this.battleState.players) m.set(id, serializeTick(p));
        return m;
    }

    public validateTick(playerId: string, clientChain: string): boolean {
        const local = this.getPlayerChain(playerId);
        if (!local) return false;
        
        const lc = parseChain(local);
        const cc = parseChain(clientChain);
        if (!lc || !cc) return false;
        
        if (cc.life > lc.life) return false;
        if (cc.phase < lc.phase || cc.phase > lc.phase + 1) return false;
        if (cc.positionX < 0 || cc.positionX > ARENA_WIDTH) return false;
        if (cc.positionY < 0 || cc.positionY > ARENA_HEIGHT) return false;
        
        return true;
    }

    public startTicks(): void {
        if (this.tickInterval) return;
        this.tickInterval = setInterval(() => this.processTick(), TICK_INTERVAL_MS);
    }

    public stopTicks(): void {
        if (this.tickInterval) { clearInterval(this.tickInterval); this.tickInterval = null; }
    }

    public getBattleState(): BattleState { return this.battleState; }
    public getTickCount(): number { return this.tickCount; }
    public isComplete(): boolean { return this.battleState.isComplete; }
    
    public clear(): void {
        this.battleState.players.clear();
        this.battleState.projectiles.clear();
        this.battleState.winner = null;
        this.battleState.isComplete = false;
        this.tickCount = 0;
    }
}

export default BattleTick;
export { TICK_INTERVAL_MS, MAX_PLAYERS, ARENA_WIDTH, ARENA_HEIGHT, STARTING_LIFE, MAX_PHASES };