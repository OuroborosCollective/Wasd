/** Minimal IWorldEvent shape (aligned with server history entries). */
export interface IWorldEvent {
  id: string;
  title: string;
  description: string;
  timestamp: number;
  involvedFactionIds: string[];
}
