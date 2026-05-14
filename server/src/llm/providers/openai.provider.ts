/**
 * OpenAI Provider
 */

export type ReviewLLMJson = {
  score: number;
  solid: { passed: boolean; violations: string[]; details: string };
  leaks: { detected: boolean; risks: string[] };
  schema: { isValid: boolean; mismatches: string[] };
  suggestions: string[];
};

export class OpenAIProvider {
  chat(messages: unknown[]) {
    return messages;
  }

  /** Default structured payload for review-style prompts. */
  async generateJSON(_prompt: string): Promise<ReviewLLMJson> {
    return {
      score: 0,
      solid: { passed: true, violations: [], details: "" },
      leaks: { detected: false, risks: [] },
      schema: { isValid: true, mismatches: [] },
      suggestions: [],
    };
  }
}
