import { BehaviorTree } from "./BehaviorTree.js";

export class NPCBrain {
  private tree = new BehaviorTree();

  update(npc: any) {
    const action = this.tree.run(npc);
    npc.currentAction = action;
    return action;
  }
}