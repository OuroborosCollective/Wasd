export interface ScheduleEntry {
  time: number; // Hour (0-23)
  action: string;
  target?: { x: number, y: number };
  dialogue?: string;
}

export const NPCScheduleRegistry: Record<string, ScheduleEntry[]> = {
  "npc_1": [
    { time: 6, action: "wake", target: { x: 32, y: 32 } },
    { time: 8, action: "work", target: { x: 40, y: 40 }, dialogue: "Time to start the day!" },
    { time: 12, action: "lunch", target: { x: 35, y: 35 } },
    { time: 14, action: "work", target: { x: 40, y: 40 } },
    { time: 18, action: "relax", target: { x: 32, y: 32 }, dialogue: "What a productive day." },
    { time: 22, action: "sleep", target: { x: 30, y: 30 } }
  ],
  "npc_2": [
    { time: 0, action: "patrol", target: { x: 500, y: 500 } },
    { time: 6, action: "patrol", target: { x: 550, y: 500 } },
    { time: 12, action: "patrol", target: { x: 550, y: 550 } },
    { time: 18, action: "patrol", target: { x: 500, y: 550 } }
  ],
  "npc_4": [
    { time: 7, action: "wake", target: { x: 64, y: 64 } },
    { time: 8, action: "forge", target: { x: 70, y: 70 }, dialogue: "The iron is hot!" },
    { time: 20, action: "rest", target: { x: 64, y: 64 } },
    { time: 23, action: "sleep", target: { x: 60, y: 60 } }
  ]
};
