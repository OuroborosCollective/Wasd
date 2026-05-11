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

export const useWorldHistory = create<WorldHistoryState>((set) => ({
  history: [],
  legendStatus: 'Die Ouroboros-Schleife ist ruhig.',
  lastLegendUpdate: Date.now(),

  addHistoryEntry: (entry) =>
    set((state: WorldHistoryState) => ({
      history: [
        ...state.history,
        {
          ...entry,
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
          timestamp: Date.now(),
        },
      ],
    })),

  updateLegendStatus: (newStatus: string) =>
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
