/**
 * AIService.ts
 */
export class AIService {
    async process(input: string): Promise<string> {
        console.log("[AIService] Perzipiere: " + input);
        return "Axiom verifiziert: " + input;
    }

    /** Used by swarm agents — delegates to {@link process}. */
    async generateResponse(prompt: string): Promise<string> {
        return this.process(prompt);
    }
}