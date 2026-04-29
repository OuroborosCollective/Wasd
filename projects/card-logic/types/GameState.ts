export interface CardStats {
    attack: number;
    health: number;
    manaCost: number;
}

export interface Card {
    id: string;
    instanceId: string;
    stats: CardStats;
}

export interface Player {
    id: string;
    hp: number;
    mana: number;
    maxMana: number;
    deck: Card[];
    hand: Card[];
    field: Card[];
    graveyard: Card[];
}

export type GamePhase = "DRAW" | "MAIN" | "COMBAT" | "END";

export interface GameState {
    turn: number;
    phase: GamePhase;
    activePlayerId: string;
    players: { [playerId: string]: Player };
}