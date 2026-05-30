import { create } from 'zustand';

export const useStore = create((set) => ({
  isActive: true,
  inventoryOpen: false,
  activeQuests: [],
  nearbyLoot: [],
  health: 1000,
  maxHealth: 1000,
  mana: 1000,
  maxMana: 1000,
  deviceTier: 'desktop',
  setIsActive: (v: boolean) => set({ isActive: v }),
}));
