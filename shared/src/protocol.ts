export enum ServerMessageType {
    WELCOME = 'SERVER_WELCOME',
    STATE_UPDATE = 'SERVER_STATE_UPDATE',
    PLAYER_JOINED = 'SERVER_PLAYER_JOINED',
    PLAYER_LEFT = 'SERVER_PLAYER_LEFT',
    ERROR = 'SERVER_ERROR',
    CHAT_MESSAGE = 'SERVER_CHAT_MESSAGE'
}

export enum ClientMessageType {
    JOIN = 'CLIENT_JOIN',
    LEAVE = 'CLIENT_LEAVE',
    INPUT_COMMAND = 'CLIENT_INPUT_COMMAND',
    SEND_CHAT = 'CLIENT_SEND_CHAT',
    PING = 'CLIENT_PING'
}

export interface NetworkMessage<T = any> {
    type: ServerMessageType | ClientMessageType;
    timestamp: number;
    payload: T;
}

export interface PlayerData {
    id: string;
    username: string;
    position: { x: number; y: number };
    rotation: number;
    health: number;
}

export interface WelcomePayload {
    clientId: string;
    initialState: GameStatePayload;
    config: {
        tickRate: number;
        mapWidth: number;
        mapHeight: number;
    };
}

export interface GameStatePayload {
    players: Record<string, PlayerData>;
    timestamp: number;
    sequenceNumber: number;
}

export interface InputCommandPayload {
    sequenceNumber: number;
    input: {
        up: boolean;
        down: boolean;
        left: boolean;
        right: boolean;
        action: boolean;
    };
    rotation: number;
}

export interface JoinPayload {
    username: string;
}

export interface ChatPayload {
    senderId?: string;
    senderName?: string;
    message: string;
}

export interface ErrorPayload {
    code: string;
    message: string;
}

export type ServerMessage = NetworkMessage<WelcomePayload | GameStatePayload | PlayerData | string | ChatPayload | ErrorPayload>;
export type ClientMessage = NetworkMessage<JoinPayload | InputCommandPayload | ChatPayload | null>;