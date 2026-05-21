// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class NPCDialogueSystem {
  talk(npc: any, worldSignals: any = {}) {
    const lines = npc.dialogueLines || [
      "Die Welt flüstert merkwürdige Dinge.",
      "Ich habe da ein Gerücht gehört."
    ];

    return {
      line: lines[Math.floor(Math.random() * lines.length)],
      signals: worldSignals
    };
  }
}
