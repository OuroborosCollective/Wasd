export type GameMessage = {
  type: string;
  payload: any;
};

export interface LoginPayload {
  token?: string;
  username?: string;
  characterId?: string;
}

export interface CharacterData {
  id: string;
  name: string;
  level: number;
  stats: any;
}
