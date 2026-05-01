import { EventEmitter } from 'events';
import { 
    IAgentContext, 
    ISceneEvent, 
    SceneEventType, 
    DialogueEntry,
    AgentPromptBuilder,
    MemoryProcessor
} from '@areloria/core-logic';

/**
 * ReactiveBrain implements LLM_AGENT_DESIGN principles by leveraging centralized
 * logic from @areloria/core-logic to allow NPCs to dynamically adapt to scene changes.
 */
export class ReactiveBrain {
    private context: IAgentContext;
    private eventBus: EventEmitter;
    private maxHistoryLength: number = 10;
    private promptBuilder: AgentPromptBuilder;
    private memoryProcessor: MemoryProcessor;

    constructor(npcId: string, name: string, eventBus: EventEmitter) {
        this.eventBus = eventBus;
        this.context = {
            id: npcId,
            name,
            personality: "Curious and observant villager.",
            biography: "A long-time resident of this digital realm, always interested in new architecture.",
            knowledge: ["The world is currently quiet."],
            spatialAwareness: [],
            history: []
        };

        this.promptBuilder = new AgentPromptBuilder();
        this.memoryProcessor = new MemoryProcessor();
        this.initializeEventListeners();
    }

    private initializeEventListeners(): void {
        this.eventBus.on('SCENE_EVENT', (event: ISceneEvent) => {
            this.processSceneEvent(event);
        });

        this.eventBus.on(`INTERACT_${this.context.id}`, (data: { playerId: string; message: string }) => {
            this.handlePlayerInteraction(data.playerId, data.message);
        });
    }

    private processSceneEvent(event: ISceneEvent): void {
        switch (event.type) {
            case SceneEventType.ASSET_PLACED:
                this.handleAssetPlacement(event.payload);
                break;
            case SceneEventType.ENVIRONMENT_CHANGE:
                this.handleEnvironmentChange(event.payload);
                break;
        }
    }

    private handleAssetPlacement(payload: ISceneEvent['payload']): void {
        const { assetPath, position } = payload;
        let reactionUpdate = "";

        if (assetPath.includes('blacksmith.glb')) {
            reactionUpdate = `A blacksmith forge was just built at coordinates ${position.x}, ${position.z}. I can hear the ringing of the anvil already.`;
            this.context.spatialAwareness.push("Local Blacksmith");
        } else if (assetPath.includes('well.glb')) {
            reactionUpdate = "A new well has been placed. Water is life!";
            this.context.spatialAwareness.push("Water Well");
        } else {
            reactionUpdate = `Something new was placed in the world: ${assetPath.split('/').pop()}.`;
        }

        this.updateInternalMonologue(reactionUpdate);
        
        this.eventBus.emit('NPC_SPEECH_BUBBLE', {
            npcId: this.context.id,
            text: `Oh! Look at that ${assetPath.includes('blacksmith') ? 'forge' : 'new addition'} over there!`
        });
    }

    private handleEnvironmentChange(payload: any): void {
        const timeOfDay = payload.timeOfDay || 'day';
        this.updateInternalMonologue(`The sun is setting. It is now ${timeOfDay}.`);
    }

    private updateInternalMonologue(newInfo: string): void {
        this.context.knowledge = this.memoryProcessor.ingest(this.context.knowledge, newInfo, 20);
        console.log(`[ReactiveBrain:${this.context.name}] Memory Updated: ${newInfo}`);
    }

    public generateSystemPrompt(): string {
        return this.promptBuilder.build({
            name: this.context.name,
            personality: this.context.personality,
            biography: this.context.biography,
            knowledge: this.context.knowledge.slice(-3),
            spatialAwareness: this.context.spatialAwareness,
            customInstructions: "If a blacksmith is mentioned, you know it was recently placed."
        });
    }

    private async handlePlayerInteraction(playerId: string, message: string): Promise<void> {
        const systemPrompt = this.generateSystemPrompt();
        
        let responseText = "";
        if (message.toLowerCase().includes("blacksmith") && this.context.spatialAwareness.includes("Local Blacksmith")) {
            responseText = "The new blacksmith? Yes, I saw them setting up the forge just now. It's about time we had a decent smithy in town!";
        } else {
            const lastKnowledge = this.context.knowledge[this.context.knowledge.length - 1];
            responseText = `Hello! I was just thinking about the changes in our world. ${lastKnowledge}`;
        }

        const userEntry: DialogueEntry = { role: 'user', content: message, timestamp: Date.now() };
        const assistantEntry: DialogueEntry = { role: 'assistant', content: responseText, timestamp: Date.now() };

        this.context.history = [...this.context.history, userEntry, assistantEntry].slice(-this.maxHistoryLength);

        this.eventBus.emit('NPC_RESPONSE', {
            npcId: this.context.id,
            playerId,
            text: responseText
        });
    }

    public getContext(): IAgentContext {
        return { ...this.context };
    }
}