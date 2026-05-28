import { NPCChatBridge } from "./NPCChatBridge.js";
import { LLMService } from "../llm/LLMService.js";
import type { NPCContext } from "./NPCChatTypes.js";

export type { NPCContext };

export class NPCChatAgent {
    private bridge: NPCChatBridge;
    private llm: LLMService;

    constructor(bridge: NPCChatBridge, llm: LLMService) {
        this.bridge = bridge;
        this.llm = llm;
    }

    public async processRequest(npcId: string, userId: string, userInput: string): Promise<string> {
        const context: NPCContext = await this.bridge.getNPCCognitiveContext(npcId, userId);
        
        const systemPrompt = this.buildSystemPrompt(context);
        const augmentedUserMessage = this.buildAugmentedUserMessage(userInput, context);

        const apiMessages = [
            { role: "system" as const, content: systemPrompt },
            ...context.recentMessages,
            { role: "user" as const, content: augmentedUserMessage }
        ];

        const response = await this.llm.generateResponse({
            messages: apiMessages,
            temperature: 0.8,
            maxTokens: 500
        });

        await this.bridge.persistInteraction(npcId, userId, userInput, response);

        return response;
    }

    private buildSystemPrompt(context: NPCContext): string {
        const { npc, worldState } = context;
        return `You are ${npc.name}. 
Personality Profile: ${npc.personality}
Personal Background: ${npc.background}
Primary Objectives: ${npc.goals.join(", ")}

Current Operational Environment:
- Location: ${worldState.currentLocation}
- Time of Day: ${worldState.currentTime}
- Environmental Factors: ${worldState.environmentConditions}

Maintain character consistency at all times. Respond concisely and in accordance with your goals.`.trim();
    }

    private buildAugmentedUserMessage(input: string, context: NPCContext): string {
        const historyContext = context.worldHistory.length > 0 
            ? "Recent Significant World Events:\n" + context.worldHistory
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 5)
                .map(event => {
                    // @are-telemetry-side-channel: NPC UI timestamps are Level-C presentation
                    const timeStr = new Date(event.timestamp).toLocaleTimeString();
                    return `[${timeStr}] ${event.description}`;
                })
                .join("\n")
            : "No significant recent world events.";

        return `### CONTEXTUAL AWARENESS
${historyContext}

### USER INPUT
${input}

Respond as ${context.npc.name}:`.trim();
    }
}

export function tickNpcChat(
    npc: any,
    cache: any,
    router: any,
    recipients: any[],
    sendToPlayer: (sid: string, payload: any) => void,
    broadcast: (payload: any) => void,
    resolveSocketId: (pid: string) => string | undefined
): void {
    // Logic moved to WorldTick.ts loop or stubbed here
}
