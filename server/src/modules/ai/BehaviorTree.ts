export interface BrainDecision {
  action: string;
  thought: string;
}

export class BehaviorTree {
  run(npc: any): BrainDecision {
    if (npc.needs?.sleep) return { action: "sleep", thought: "Evaluating local heuristics: Priority [Rest]. Reasoning: Energy critically low." };
    if (npc.needs?.hunger) return { action: "eat", thought: "Evaluating local heuristics: Priority [Food]. Reasoning: Nutrient reserves depleted." };
    if (npc.job) return { action: "work", thought: "Evaluating local heuristics: Priority [Economic Duty]. Reasoning: Assigned task pending." };
    return { action: "wander", thought: "Evaluating local heuristics: Priority [Patrol]. Reasoning: No pressing needs." };
  }
}
