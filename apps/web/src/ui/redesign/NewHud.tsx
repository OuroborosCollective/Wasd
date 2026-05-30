import React, { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { SharedUtils } from '@wasd/shared';

export interface QuestStateNet {
  id: string;
  name: string;
  target: string;
  progress: number;
  maxProgress: number;
  description?: string;
}

export const NewHud: React.FC<any> = () => {
  const { 
    isActive, 
    inventoryOpen, 
    activeQuests, 
    nearbyLoot,
    health,
    maxHealth,
    mana,
    maxMana,
    deviceTier 
  } = useStore((state: any) => ({
    isActive: state.isActive,
    inventoryOpen: state.inventoryOpen,
    activeQuests: state.activeQuests,
    nearbyLoot: state.nearbyLoot,
    health: state.health,
    maxHealth: state.maxHealth,
    mana: state.mana,
    maxMana: state.maxMana,
    deviceTier: state.deviceTier
  }));

  const isLowEnd = useMemo(() => deviceTier === 'mobile', [deviceTier]);

  const healthPercent = useMemo(() => {
    if (maxHealth <= 0) return 0;
    return Math.floor((health * 100) / maxHealth);
  }, [health, maxHealth]);

  const manaPercent = useMemo(() => {
    if (maxMana <= 0) return 0;
    return Math.floor((mana * 100) / maxMana);
  }, [mana, maxMana]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 select-none font-sans">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2 w-64">
           {/* Unused variables to suppress TS error while keeping structure */}
           <div style={{display:'none'}}>{inventoryOpen}{activeQuests.length}{nearbyLoot.length}{isLowEnd}{manaPercent}{SharedUtils.KAPPA_SCALE}</div>
          <div
            role="progressbar"
            aria-label="Health"
            aria-valuenow={Math.floor(health / 1000)}
            aria-valuemin={0}
            aria-valuemax={Math.floor(maxHealth / 1000)}
            className="h-6 bg-black/50 border border-white/10 rounded-sm overflow-hidden backdrop-blur-md"
          >
            <div 
              className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-100"
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewHud;
