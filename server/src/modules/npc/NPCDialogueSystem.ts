import { SeededARERng, createARESeed } from "../../core/determinism/AREDeterminism.js";

export class NPCDialogueSystem {
  talk(npc: any, worldSignals: any = {}) {
    const lines = npc.dialogueLines || [
      "Die Welt flüstert merkwürdige Dinge.",
      "Ich habe da ein Gerücht gehört."
    ];
    const seed = createARESeed(["npc-dialogue", npc?.id, npc?.name, worldSignals?.tick ?? 0, lines.length]);
    const index = new SeededARERng(seed).nextInt(lines.length);

    return {
      line: lines[index],
      signals: worldSignals
    };
  }
}
