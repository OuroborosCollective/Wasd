export class BehaviorTree {
  run(npc: any) {
    if (npc.needs?.sleep) return "sleep";
    if (npc.needs?.hunger) return "eat";
    if (npc.job) return "work";
    return "wander";
  }
}