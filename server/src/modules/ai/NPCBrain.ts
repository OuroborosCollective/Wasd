import { BehaviorTree, BrainDecision } from "./BehaviorTree.js";

export class NPCBrain {
  private tree = new BehaviorTree();

  update(npc: any): BrainDecision {
    const decision = this.tree.run(npc);
    npc.currentAction = decision.action;
    return decision;
  }
}
