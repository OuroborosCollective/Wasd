export interface NPCContext {
  npc: {
    name: string;
    personality: string;
    background: string;
    goals: string[];
  };
  worldState: {
    currentLocation: string;
    currentTime: string;
    environmentConditions: string;
  };
  worldHistory: Array<{
    timestamp: number;
    description: string;
    importance: number;
  }>;
  recentMessages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
}
