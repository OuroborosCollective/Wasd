/** Optional hooks for the React game HUD — registered by `mountGameHudOverlay`. */

export type GameHudWsBridge = {
  onEntitySync: (entities: unknown[]) => void;
  onLootSpawned: (loot: unknown) => void;
  onLootDespawned: (lootId: string) => void;
  onProtocolMsg: (msg: unknown) => void;
  /** True after `welcome`, false on disconnect / reconnect before welcome. */
  onGameConnected?: (connected: boolean) => void;
};

let bridge: GameHudWsBridge | null = null;
/** Replayed when the React HUD mounts after the socket already welcomed. */
let lastGameConnected = false;

export function registerGameHudWsBridge(next: GameHudWsBridge | null) {
  bridge = next;
  if (next?.onGameConnected) {
    next.onGameConnected(lastGameConnected);
  }
}

export function pushEntitySyncToGameHud(entities: unknown[]) {
  bridge?.onEntitySync(entities);
}

export function pushLootSpawnedToGameHud(loot: unknown) {
  bridge?.onLootSpawned(loot);
}

export function pushLootDespawnedToGameHud(lootId: string) {
  bridge?.onLootDespawned(lootId);
}

export function pushProtocolMsgToGameHud(msg: unknown) {
  bridge?.onProtocolMsg(msg);
}

export function pushGameHudConnected(connected: boolean) {
  lastGameConnected = connected;
  bridge?.onGameConnected?.(connected);
}
