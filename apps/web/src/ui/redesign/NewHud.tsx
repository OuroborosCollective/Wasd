import React, { useMemo } from 'react';
import { useStore } from '../../store/useStore';

/**
 * FIX: Nutzung von Workspace-Aliasen (@wasd/protocol und @wasd/shared)
 * zur Auflösung von CI Build-Fehlern und Einhaltung der Monorepo-Struktur.
 */
import { DeviceTier } from '@wasd/protocol';
import { KAPPA } from '@wasd/shared';

/**
 * QuestStateNet Definition mit den geforderten Feldern name und target.
 */
export interface QuestStateNet {
  id: string;
  name: string;
  target: string;
  progress: number;
  maxProgress: number;
  description?: string;
}

/**
 * Erweitertes GameHudState Interface gemäß Vorgabe.
 */
interface GameHudState {
  isActive: boolean; 
  inventoryOpen: boolean;
  activeQuests: QuestStateNet[];
  nearbyLoot: string[];
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
}

/**
 * NewHud Komponente - Implementiert das visuelle Interface basierend auf dem WorldState.
 * Nutzt Fixed-Point Math (KAPPA = 1000) für deterministische Fortschrittsanzeige.
 */
export const NewHud: React.FC = () => {
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
  } = useStore((state) => ({
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

  const isLowEnd = useMemo(() => deviceTier === DeviceTier.LOW || deviceTier === DeviceTier.MOBILE, [deviceTier]);

  /**
   * Berechnung der Prozentwerte unter Berücksichtigung der KAPPA-Skalierung.
   * Da KAPPA=1000, werden hier Rohwerte sicher verarbeitet.
   */
  const healthPercent = useMemo(() => (maxHealth > 0 ? (health * 100) / maxHealth : 0), [health, maxHealth]);
  const manaPercent = useMemo(() => (maxMana > 0 ? (mana * 100) / maxMana : 0), [mana, maxMana]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 select-none">
      {/* Top Section: Health & Mana Status */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2 w-64">
          <div className="h-6 bg-black/40 border border-white/10 rounded-full overflow-hidden backdrop-blur-md">
            <div 
              className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300"
              style={{ width: `${healthPercent}%` }}
            />
          </div>
          <div className="h-4 bg-black/40 border border-white/10 rounded-full overflow-hidden backdrop-blur-md">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-300"
              style={{ width: `${manaPercent}%` }}
            />
          </div>
        </div>

        {/* Quest Tracker - Synchronisiert mit AxiomValidationLayer State */}
        <div className="w-72 bg-black/30 p-4 border border-white/5 rounded-lg backdrop-blur-sm">
          <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">Active Quests</h3>
          <div className="flex flex-col gap-4">
            {activeQuests.map((quest) => (
              <div key={quest.id} className="flex flex-col gap-1">
                <span className="text-white font-medium text-sm">{quest.name}</span>
                <span className="text-white/40 text-xs italic">Target: {quest.target}</span>
                <div className="w-full h-1 bg-white/10 mt-1">
                  <div 
                    className="h-full bg-yellow-500" 
                    style={{ width: `${(quest.progress / (quest.maxProgress || KAPPA)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {activeQuests.length === 0 && <span className="text-white/20 text-xs">No active tasks</span>}
          </div>
        </div>
      </div>

      {/* Middle Section: Interaction Alerts */}
      <div className="flex justify-center">
        {!inventoryOpen && nearbyLoot.length > 0 && (
          <div className="bg-white/90 text-black px-4 py-2 rounded shadow-2xl animate-bounce">
            <span className="text-xs font-bold uppercase">Press [E] to loot {nearbyLoot.length} items</span>
          </div>
        )}
      </div>

      {/* Bottom Section: Navigation & Controls */}
      <div className="flex justify-between items-end">
        <div className="flex gap-2">
          {!isLowEnd && (
            <div className="flex gap-4 text-[10px] text-white/40">
              <div className="flex flex-col items-center gap-1">
                <div className="w-6 h-6 border border-white/20 rounded flex items-center justify-center">I</div>
                <span>Inventory</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-6 h-6 border border-white/20 rounded flex items-center justify-center">M</div>
                <span>Map</span>
              </div>
            </div>
          )}
        </div>

        {/* Inventory Overlay Prompt */}
        <div className="text-right">
          {inventoryOpen && (
            <div className="bg-black/80 border border-yellow-500/50 p-4 rounded text-white mb-4 pointer-events-auto">
              <h2 className="text-yellow-500 font-bold mb-2">Inventory Access</h2>
              <p className="text-sm text-white/70">Management of resources and equipment active.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewHud;