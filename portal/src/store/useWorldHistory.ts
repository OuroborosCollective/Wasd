import { create } from 'zustand';

export interface WorldHistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  intensity: number;
  category: 'mythos' | 'reality' | 'anomaly';
}

export interface WorldHistoryState {
  history: WorldHistoryEntry[];
  legendStatus: string;
  lastLegendUpdate: number;
  addHistoryEntry: (entry: Omit<WorldHistoryEntry, 'id' | 'timestamp'>) => void;
  updateLegendStatus: (newStatus: string) => void;
  clearHistory: () => void;
}

/**
 * useWorldHistory Hook
 * Verwaltet die globale Historie der Welt und den aktuellen Status der 'Legenden-Lage'.
 * Abonnenten (z.B. OuroborosAssistant) reagieren auf Änderungen des legendStatus.
 */
export const useWorldHistory = create<WorldHistoryState>((set) => ({
  history: [],
  legendStatus: 'Die Ouroboros-Schleife ist ruhig.',
  lastLegendUpdate: Date.now(),

  addHistoryEntry: (entry) =>
    set((state) => ({
      history: [
        ...state.history,
        {
          ...entry,
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
          timestamp: Date.now(),
        },
      ],
    })),

  updateLegendStatus: (newStatus) =>
    set(() => ({
      legendStatus: newStatus,
      lastLegendUpdate: Date.now(),
    })),

  clearHistory: () =>
    set(() => ({
      history: [],
      legendStatus: 'Historie zurückgesetzt. Die Legende beginnt von vorn.',
      lastLegendUpdate: Date.now(),
    })),
}));

export default useWorldHistory;