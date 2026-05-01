import { EventEmitter } from 'events';
<<<<<<< architect-fix-1777640719960
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
=======

export interface SceneEvent {
    type: 'ASSET_PLACED' | 'ASSET_REMOVED' | 'ENVIRONMENT_CHANGE';
    payload: {
        assetId: string;
        assetPath: string;
        position: { x: number; y: number; z: number };
        metadata?: any;
    };
}

export interface DialogueEntry {
    role: 'user' | 'assistant';
    content: string;
}

export interface NPCContext {
    npcId: string;
    name: string;
    personality: string;
    biography: string;
    currentKnowledge: string[];
    spatialAwareness: string[];
    dialogueHistory: DialogueEntry[];
}

/**
 * Manages the internal state and long-term/short-term memory of the NPC.
 */
class MemoryManager {
    private context: NPCContext;
    private readonly maxHistory: number = 10;
    private readonly maxKnowledge: number = 20;
>>>>>>> main

    constructor(npcId: string, name: string) {
        this.context = {
            id: npcId,
            name,
            personality: "Curious and observant villager.",
            biography: "A long-time resident of this digital realm, always interested in new architecture.",
            knowledge: ["The world is currently quiet."],
            spatialAwareness: [],
            history: []
        };
<<<<<<< architect-fix-1777640719960

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
=======
    }

    public updateKnowledge(info: string): void {
        this.context.currentKnowledge.push(info);
        if (this.context.currentKnowledge.length > this.maxKnowledge) {
            this.context.currentKnowledge.shift();
        }
    }

    public addSpatialAwareness(item: string): void {
        if (!this.context.spatialAwareness.includes(item)) {
            this.context.spatialAwareness.push(item);
        }
    }

    public recordDialogue(entry: DialogueEntry): void {
        this.context.dialogueHistory.push(entry);
        if (this.context.dialogueHistory.length > this.maxHistory) {
            this.context.dialogueHistory = this.context.dialogueHistory.slice(-this.maxHistory);
        }
    }

    public getContext(): NPCContext {
        return { ...this.context };
    }
}

/**
 * Logic for interpreting environmental changes into semantic meaning.
 */
class PerceptionEngine {
    public interpretSceneEvent(event: SceneEvent): { observation: string; keyObject?: string; reaction?: string } {
        const { assetPath, position } = event.payload;
        const assetName = assetPath.split('/').pop() || 'object';

        if (event.type === 'ASSET_PLACED') {
            if (assetPath.includes('blacksmith.glb')) {
                return {
                    observation: `A blacksmith forge was built at ${position.x}, ${position.z}.`,
                    keyObject: "Local Blacksmith",
                    reaction: "Oh! Look at that forge over there!"
                };
            }
            if (assetPath.includes('well.glb')) {
                return {
                    observation: "A new well has been placed nearby.",
                    keyObject: "Water Well",
                    reaction: "Fresh water! A new well has been built."
                };
            }
            return {
                observation: `New structure detected: ${assetName}.`,
                reaction: `Interesting, a new ${assetName.replace('.glb', '')} has appeared.`
            };
        }

        if (event.type === 'ENVIRONMENT_CHANGE') {
            const tod = event.payload.timeOfDay || 'day';
            return { observation: `The environment changed. It is now ${tod}.` };
        }

        return { observation: "The world feels different." };
    }
}

/**
 * Orchestrator Pattern: ReactiveBrain coordinates between Perception, Memory, and Action.
 */
export class ReactiveBrain {
    private memory: MemoryManager;
    private perception: PerceptionEngine;
    private eventBus: EventEmitter;

    constructor(npcId: string, name: string, eventBus: EventEmitter) {
        this.eventBus = eventBus;
        this.memory = new MemoryManager(npcId, name);
        this.perception = new PerceptionEngine();

        this.initializeEventListeners();
>>>>>>> main
    }

    private initializeEventListeners(): void {
        // Core Perception Loop
        this.eventBus.on('SCENE_EVENT', (event: SceneEvent) => {
            this.handlePerception(event);
        });

        // Interaction Loop
        this.eventBus.on(`INTERACT_${this.memory.getContext().npcId}`, (data: { playerId: string; message: string }) => {
            this.handleInteraction(data.playerId, data.message);
        });
    }

<<<<<<< architect-fix-1777640719960
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
        
=======
    private handlePerception(event: SceneEvent): void {
        const interpretation = this.perception.interpretSceneEvent(event);
        
        // Update Memory (Headless State)
        this.memory.updateKnowledge(interpretation.observation);
        if (interpretation.keyObject) {
            this.memory.addSpatialAwareness(interpretation.keyObject);
        }

        // Trigger Behavior (Interaction Layer)
        if (interpretation.reaction) {
            this.eventBus.emit('NPC_SPEECH_BUBBLE', {
                npcId: this.memory.getContext().npcId,
                text: interpretation.reaction
            });
        }

        console.log(`[NPC_ORCHESTRATOR:${this.memory.getContext().name}] Processed: ${interpretation.observation}`);
    }

    private async handleInteraction(playerId: string, message: string): Promise<void> {
        const context = this.memory.getContext();
        const systemPrompt = this.generateSystemPrompt(context);
        
        // Inference logic (Synchronized with server-side knowledge)
>>>>>>> main
        let responseText = "";
        const lowerMsg = message.toLowerCase();

        if (lowerMsg.includes("blacksmith") && context.spatialAwareness.includes("Local Blacksmith")) {
            responseText = "The new blacksmith? Yes, I saw them setting up the forge. It's a great addition to our village!";
        } else if (lowerMsg.includes("well") && context.spatialAwareness.includes("Water Well")) {
            responseText = "The water from the new well is quite refreshing. You should try it.";
        } else {
<<<<<<< architect-fix-1777640719960
            const lastKnowledge = this.context.knowledge[this.context.knowledge.length - 1];
            responseText = `Hello! I was just thinking about the changes in our world. ${lastKnowledge}`;
        }

        const userEntry: DialogueEntry = { role: 'user', content: message, timestamp: Date.now() };
        const assistantEntry: DialogueEntry = { role: 'assistant', content: responseText, timestamp: Date.now() };

        this.context.history = [...this.context.history, userEntry, assistantEntry].slice(-this.maxHistoryLength);
=======
            const lastThought = context.currentKnowledge[context.currentKnowledge.length - 1];
            responseText = `Greetings! I was just observing the world. ${lastThought}`;
        }

        // Commit to Memory
        this.memory.recordDialogue({ role: 'user', content: message });
        this.memory.recordDialogue({ role: 'assistant', content: responseText });
>>>>>>> main

        // Execute Action
        this.eventBus.emit('NPC_RESPONSE', {
<<<<<<< architect-fix-1777640719960
            npcId: this.context.id,
=======
            npcId: context.npcId,
>>>>>>> main
            playerId,
            text: responseText
        });
    }

<<<<<<< architect-fix-1777640719960
    public getContext(): IAgentContext {
        return { ...this.context };
=======
    private generateSystemPrompt(ctx: NPCContext): string {
        const awareness = ctx.spatialAwareness.length > 0 
            ? `Known landmarks: ${ctx.spatialAwareness.join(', ')}.`
            : "The surroundings are unfamiliar.";

        return `
            Identity: ${ctx.name}, ${ctx.personality}
            Background: ${ctx.biography}
            Knowledge State: ${ctx.currentKnowledge.slice(-3).join(' ')}
            Awareness: ${awareness}
            Action: Respond naturally to the player. Incorporate recent environmental changes.
        `.trim();
    }

    public getStatus(): NPCContext {
        return this.memory.getContext();
>>>>>>> main
    }
}