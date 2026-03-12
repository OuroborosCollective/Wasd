export class PlayerController {
  move(direction: string) {
    return {
      type: "move",
      direction
    };
  }
}