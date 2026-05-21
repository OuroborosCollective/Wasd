// @ARE-GUARD-EXEMPT: Infrastructure, Meta, or Telemetry logic; not world-state critical.
import { DialogueTemplates } from "./DialogueTemplates.js";

export class DialogueGenerator {
  generate(context: any) {
    const mood = context.traits?.aggression > 0.7 ? "warning" : "greeting";
    const pool = DialogueTemplates[mood] ?? ["..."];
    return {
      line: pool[Math.floor(Math.random() * pool.length)],
      contextSummary: {
        culture: context.culture,
        religion: context.religion
      }
    };
  }
}