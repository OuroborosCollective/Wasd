export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface Item {
  id: string;
  name: string;
  icon: string;
  rarity: ItemRarity;
  type: 'weapon' | 'armor' | 'accessory' | 'consumable' | 'quest' | 'misc';
  stackSize?: number;
  maxStackSize?: number;
  equippable?: boolean;
  stats?: {
    attack?: number;
    defense?: number;
    health?: number;
    mana?: number;
    [key: string]: number | undefined;
  };
  description?: string;
  value?: number;
  weight?: number;
  rarity_description?: string;
  [key: string]: any;
}
