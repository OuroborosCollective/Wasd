// @ARE-GUARD-EXEMPT: non-sim module
/** Minimal LLM facade for NPC chat experiments. */
export class LLMService {
  async complete(_prompt: string): Promise<string> {
    return "";
  }

  async generateResponse(_opts: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    void _opts;
    return "";
  }
}
