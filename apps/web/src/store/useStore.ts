import { create } from 'zustand';
export interface GameHudState {
    isActive: boolean;
    inventoryOpen: boolean;
    activeQuests: any[];
    nearbyLoot: any[];
    health: number;
    maxHealth: number;
    mana: number;
    maxMana: number;
    deviceTier: number;
}
export const useStore = create<GameHudState>((_set) => ({
    isActive: true,
    inventoryOpen: false,
    activeQuests: [],
    nearbyLoot: [],
    health: 100,
    maxHealth: 100,
    mana: 100,
    maxMana: 100,
    deviceTier: 1
}));
