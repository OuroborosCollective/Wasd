import { buildDialogueContext } from "./DialogueContext.js";
import { DialogueGenerator } from "./DialogueGenerator.js";

export class DialogueEngine {
  private generator = new DialogueGenerator();

  talk(npc: any, player: any, world: any) {
    const context = buildDialogueContext(npc, player, world);
    return this.generator.generate(context);
  }
}