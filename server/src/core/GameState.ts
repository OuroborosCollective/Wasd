/**
 * GameState.ts
 */
export interface GameState {
    tick: number;
    players: any[];
}

export class GameStateManager {
    private static instance: GameStateManager;
    public static getInstance(): GameStateManager {
        if (!this.instance) this.instance = new GameStateManager();
        return this.instance;
    }
    public setWorldPhase(phase: string): void {}
}