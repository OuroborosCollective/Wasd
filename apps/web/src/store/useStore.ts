import { create } from 'zustand';

interface StoreState {
  isActive: boolean;
  inventoryOpen: boolean;
  activeQuests: any[];
  nearbyLoot: any[];
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  deviceTier: string;
  toggleInventory: () => void;
}

export const useStore = create<StoreState>((set) => ({
  isActive: true,
  inventoryOpen: false,
  activeQuests: [],
  nearbyLoot: [],
  health: 1000,
  maxHealth: 1000,
  mana: 1000,
  maxMana: 1000,
  deviceTier: 'HIGH',
  toggleInventory: () => set((state: any) => ({ inventoryOpen: !state.inventoryOpen })),
}));
