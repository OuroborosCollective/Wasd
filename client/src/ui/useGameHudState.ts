import { useSyncExternalStore } from "react";
import { getGameHudSnapshot, initGameHudStore, subscribeGameHud } from "./gameHudStore";

export function useGameHudState() {
  initGameHudStore();
  return useSyncExternalStore(subscribeGameHud, getGameHudSnapshot, getGameHudSnapshot);
}
