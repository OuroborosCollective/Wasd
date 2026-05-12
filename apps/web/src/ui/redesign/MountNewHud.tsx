import React from 'react';
import { create } from 'zustand';

/**
 * Interface für den globalen Game HUD State.
 * Erweitert um die notwendigen Eigenschaften zur Synchronisation von Entitäten, Loot und Inventar.
 */
interface GameHudState {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  
  // Identitäts- und Welt-Daten
  youId: string | null;
  entities: Map<string, any>;
  loot: Map<string, any>;
  inv: any[];
  fxFeed: any[];

  // Event-Handler / Actions
  onWirePayload: (payload: any) => void;
  onEntitySync: (data: any) => void;
  onLootSpawned: (data: any) => void;
  onLootDespawned: (id: string) => void;
  
  // State-Setter
  setYouId: (id: string | null) => void;
  setInv: (items: any[]) => void;
  addFx: (fx: any) => void;
}

/**
 * Zustand Store für das HUD.
 * Verwaltet den UI-Zustand und die eingehenden Netzwerk-Payloads für das Rendering.
 */
export const useGameHudStore = create<GameHudState>((set) => ({
  isOpen: true,
  setIsOpen: (val) => set({ isOpen: val }),
  
  youId: null,
  entities: new Map(),
  loot: new Map(),
  inv: [],
  fxFeed: [],

  setYouId: (id) => set({ youId: id }),
  setInv: (inv) => set({ inv }),
  
  addFx: (fx) => set((state) => ({
    fxFeed: [...state.fxFeed, fx].slice(-20) // Halte die letzten 20 FX-Einträge
  })),

  onWirePayload: (payload) => {
    // Logik zur Verarbeitung von Netzwerk-Paketen direkt im HUD-Store
    console.debug('[HUD] Wire Payload received', payload);
  },

  onEntitySync: (data) => set((state) => {
    const nextEntities = new Map(state.entities);
    nextEntities.set(data.id, data);
    return { entities: nextEntities };
  }),

  onLootSpawned: (data) => set((state) => {
    const nextLoot = new Map(state.loot);
    nextLoot.set(data.id, data);
    return { loot: nextLoot };
  }),

  onLootDespawned: (id) => set((state) => {
    const nextLoot = new Map(state.loot);
    nextLoot.delete(id);
    return { loot: nextLoot };
  }),
}));

/**
 * Die eigentliche HUD-UI Komponente.
 * Nutzt die GameHudState Props zur Darstellung von Spieler-Status, Inventar und Welt-Events.
 */
const NewHudOverlay: React.FC<GameHudState> = (props) => {
  if (!props.isOpen) return null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-50 flex flex-col justify-between p-4">
      {/* Header / FX Feed */}
      <div className="flex justify-between items-start">
        <div className="bg-black/40 backdrop-blur-md p-2 rounded border border-white/10 text-white text-xs">
          ID: {props.youId || 'Connecting...'}
        </div>
        <div className="flex flex-col gap-1 items-end">
          {props.fxFeed.map((fx, idx) => (
            <div key={idx} className="animate-fade-in-left bg-blue-500/20 text-blue-200 px-2 py-1 rounded text-[10px] uppercase tracking-wider">
              {fx.message || 'Effect triggered'}
            </div>
          ))}
        </div>
      </div>

      {/* Center / World Info (Loot/Entities) */}
      <div className="flex flex-col items-center justify-center gap-2">
         {/* Hier könnten kontextsensitive Infos eingeblendet werden */}
      </div>

      {/* Footer / Inventory & Actions */}
      <div className="flex justify-center items-end gap-4 pointer-events-auto">
        <div className="flex gap-2 bg-black/60 p-3 rounded-xl border border-white/20 backdrop-blur-xl">
          {props.inv.length === 0 && <div className="w-10 h-10 rounded border border-dashed border-white/20" />}
          {props.inv.map((_item, i) => (
            <div key={i} className="w-12 h-12 bg-white/5 rounded flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
              {/* Item Render Logic */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Mount-Komponente für das Redesign HUD.
 * Korrigiert die IntrinsicAttributes Zuweisung durch sauberes Prop-Mapping aus dem Store.
 */
export const MountNewHud: React.FC = () => {
  const state = useGameHudStore();

  // Die Übergabe erfolgt explizit, um TypeScript IntrinsicAttributes-Fehler zu vermeiden
  return (
    <NewHudOverlay 
      isOpen={state.isOpen}
      setIsOpen={state.setIsOpen}
      youId={state.youId}
      entities={state.entities}
      loot={state.loot}
      inv={state.inv}
      fxFeed={state.fxFeed}
      onWirePayload={state.onWirePayload}
      onEntitySync={state.onEntitySync}
      onLootSpawned={state.onLootSpawned}
      onLootDespawned={state.onLootDespawned}
      setYouId={state.setYouId}
      setInv={state.setInv}
      addFx={state.addFx}
    />
  );
};