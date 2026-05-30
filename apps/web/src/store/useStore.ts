import { create } from "zustand";

export const useStore = create((set) => ({
  isActive: true,
  inventoryOpen: false,
  activeQuests: [],
  nearbyLoot: [],
  health: 100000,
  maxHealth: 100000,
  mana: 50000,
  maxMana: 50000,
  deviceTier: "HIGH",
  setConnected: (connected: boolean) => set({ connected }),
}));
