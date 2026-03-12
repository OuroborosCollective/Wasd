export class TaskSystem {
  execute(npc: any, action: string) {
    switch (action) {
      case "wander":
        return { action, destination: "random_nearby" };
      case "work":
        return { action, destination: npc.jobLocation ?? "workplace" };
      case "eat":
        return { action, destination: "tavern" };
      case "sleep":
        return { action, destination: "home" };
      default:
        return { action: "idle" };
    }
  }
}