export type PlayerSession = {
  id: string;
  name: string;
  connectedAt: number;
  position: { x: number; y: number; z: number };
};