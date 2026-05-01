import { GameState } from "./GameState.js";
import { Player } from "../entities/Player.js";
import { GameConstants } from "../constants/GameConstants.js";
import { EventEmitter } from "events";

export class GameStateManager extends EventEmitter {
    private state: GameState;
    private lastUpdate: number;

    constructor() {
        super();
        this.state = new GameState();
        this.lastUpdate = Date.now();
    }

    public addPlayer(playerId: string, name: string): void {
        const player = new Player(playerId, name);
        this.state.players.set(playerId, player);
        this.emit("playerJoined", player);
    }

    public removePlayer(playerId: string): void {
        const player = this.state.players.get(playerId);
        if (player) {
            this.state.players.delete(playerId);
            this.emit("playerLeft", playerId);
        }
    }

    public update(): void {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 1000;
        
        this.state.players.forEach((player) => {
            player.update(deltaTime);
        });

        this.lastUpdate = now;
    }

    public getState(): GameState {
        return this.state;
    }

    public reset(): void {
        this.state = new GameState();
        this.lastUpdate = Date.now();
        this.emit("reset");
    }
}