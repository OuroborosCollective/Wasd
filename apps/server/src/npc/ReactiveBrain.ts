import { EventEmitter } from 'events';

interface SceneEvent {
    type: 'ASSET_PLACED' | 'ASSET_REMOVED' | 'ENVIRONMENT_CHANGE';
    payload: {
        assetId: string;
        assetPath: string;
        position: { x: number; y: number; z: number };
        metadata?: any;
    };
}

interface NPCContext {
    npcId: string;
    name: string;
    personality: string;
    biography: string;
    currentKnowledge: string[];
    spatialAwareness: string[];
    dialogueHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * ReactiveBrain implements LLM_AGENT_DESIGN principles to allow NPCs to 
 * dynamically adapt to scene changes and environmental stimuli.
 */
export class ReactiveBrain {
    private context: NPCContext;
    private eventBus: EventEmitter;
    private maxHistoryLength: number = 10;

    constructor(npcId: string, name: string, eventBus: EventEmitter) {
        this.eventBus = eventBus;
        this.context = {
            npcId,
            name,
            personality: "Curious and observant villager.",
            biography: "A long-time resident of this digital realm, always interested in new architecture.",
            currentKnowledge: ["The world is currently quiet."],
            spatialAwareness: [],
            dialogueHistory: []
        };

        this.initializeEventListeners();
    }

    private initializeEventListeners(): void {
        // Listen for scene mutations that affect NPC awareness
        this.eventBus.on('SCENE_EVENT', (event: SceneEvent) => {
            this.processSceneEvent(event);
        });

        // Listen for direct player interactions
        this.eventBus.on(`INTERACT_${this.context.npcId}`, (data: { playerId: string; message: string }) => {
            this.handlePlayerInteraction(data.playerId, data.message);
        });
    }

    private processSceneEvent(event: SceneEvent): void {
        switch (event.type) {
            case 'ASSET_PLACED':
                this.handleAssetPlacement(event.payload);
                break;
            case 'ENVIRONMENT_CHANGE':
                this.handleEnvironmentChange(event.payload);
                break;
        }
    }

    private handleAssetPlacement(payload: SceneEvent['payload']): void {
        const { assetPath, position } = payload;
        let reactionUpdate = "";

        // Specific logic for integrated GLB assets
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
        
        // Broadcast a spontaneous reaction to the world
        this.eventBus.emit('NPC_SPEECH_BUBBLE', {
            npcId: this.context.npcId,
            text: `Oh! Look at that ${assetPath.includes('blacksmith') ? 'forge' : 'new addition'} over there!`
        });
    }

    private handleEnvironmentChange(payload: any): void {
        const timeOfDay = payload.timeOfDay || 'day';
        this.updateInternalMonologue(`The sun is setting. It is now ${timeOfDay}.`);
    }

    private updateInternalMonologue(newInfo: string): void {
        this.context.currentKnowledge.push(newInfo);
        if (this.context.currentKnowledge.length > 20) {
            this.context.currentKnowledge.shift();
        }
        
        console.log(`[ReactiveBrain:${this.context.name}] Memory Updated: ${newInfo}`);
    }

    /**
     * Constructs the dynamic prompt for the LLM based on current scene context
     */
    public generateSystemPrompt(): string {
        const awareness = this.context.spatialAwareness.length > 0 
            ? `You are aware of: ${this.context.spatialAwareness.join(', ')}.`
            : "The area around you is mostly empty.";

        return `
            Your name is ${this.context.name}. 
            Your personality: ${this.context.personality}.
            Biography: ${this.context.biography}.
            Current World State: ${this.context.currentKnowledge.slice(-3).join(' ')}.
            ${awareness}
            Respond naturally to players, incorporating your knowledge of the environment.
            If a blacksmith is mentioned, you know it was recently placed.
        `;
    }

    private async handlePlayerInteraction(playerId: string, message: string): Promise<void> {
        // Integrate with LLM API (Placeholder for actual LLM call)
        const systemPrompt = this.generateSystemPrompt();
        
        // Logic to simulate LLM Agent Design behavior
        let responseText = "";
        if (message.toLowerCase().includes("blacksmith") && this.context.spatialAwareness.includes("Local Blacksmith")) {
            responseText = "The new blacksmith? Yes, I saw them setting up the forge just now. It's about time we had a decent smithy in town!";
        } else {
            responseText = `Hello! I was just thinking about the changes in our world. ${this.context.currentKnowledge[this.context.currentKnowledge.length - 1]}`;
        }

        // Maintain Dialogue History
        this.context.dialogueHistory.push({ role: 'user', content: message });
        this.context.dialogueHistory.push({ role: 'assistant', content: responseText });
        
        if (this.context.dialogueHistory.length > this.maxHistoryLength) {
            this.context.dialogueHistory = this.context.dialogueHistory.slice(-this.maxHistoryLength);
        }

        this.eventBus.emit('NPC_RESPONSE', {
            npcId: this.context.npcId,
            playerId,
            text: responseText
        });
    }

    public getContext(): NPCContext {
        return { ...this.context };
    }
}