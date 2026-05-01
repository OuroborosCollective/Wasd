import { EventEmitter } from 'events';

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

    constructor(npcId: string, name: string) {
        this.context = {
            npcId,
            name,
            personality: "Curious and observant villager.",
            biography: "A long-time resident of this digital realm, always interested in new architecture.",
            currentKnowledge: ["The world is currently quiet."],
            spatialAwareness: [],
            dialogueHistory: []
        };
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
        let responseText = "";
        const lowerMsg = message.toLowerCase();

        if (lowerMsg.includes("blacksmith") && context.spatialAwareness.includes("Local Blacksmith")) {
            responseText = "The new blacksmith? Yes, I saw them setting up the forge. It's a great addition to our village!";
        } else if (lowerMsg.includes("well") && context.spatialAwareness.includes("Water Well")) {
            responseText = "The water from the new well is quite refreshing. You should try it.";
        } else {
            const lastThought = context.currentKnowledge[context.currentKnowledge.length - 1];
            responseText = `Greetings! I was just observing the world. ${lastThought}`;
        }

        // Commit to Memory
        this.memory.recordDialogue({ role: 'user', content: message });
        this.memory.recordDialogue({ role: 'assistant', content: responseText });

        // Execute Action
        this.eventBus.emit('NPC_RESPONSE', {
            npcId: context.npcId,
            playerId,
            text: responseText
        });
    }

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
    }
}