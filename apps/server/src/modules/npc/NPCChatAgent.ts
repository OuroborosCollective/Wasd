import { World } from "../../core/World.js";
import { NPC } from "./NPC.js";

/**
 * Updates the chat state for all NPCs in the world.
 * This is called once per world tick.
 */
export function tickNpcChat(world: World, delta: number): void {
    const npcs = world.entityManager.getEntitiesByComponent(NPC);

    for (const npc of npcs) {
        if (!npc.chatAgent) {
            continue;
        }

        // Update the agent's internal timers and state
        npc.chatAgent.update(delta);

        // Check if the agent has a new message to broadcast
        if (npc.chatAgent.shouldSpeak()) {
            const message = npc.chatAgent.generateMessage();
            
            if (message) {
                world.chatSystem.broadcast({
                    senderId: npc.id,
                    senderName: npc.name,
                    content: message,
                    timestamp: Date.now(),
                    type: "npc"
                });
            }
        }
    }
}

export class NPCChatAgent {
    private lastSpeakTime: number = 0;
    private speakInterval: number = 5000 + Math.random() * 10000;
    private phrases: string[] = [
        "Schöner Tag heute, nicht wahr?",
        "Habt ihr die Gerüchte über die alten Ruinen gehört?",
        "Willkommen in unserer Stadt!",
        "Ich habe heute viel zu tun.",
        "Vorsicht da draußen!"
    ];

    constructor(phrases?: string[]) {
        if (phrases) {
            this.phrases = phrases;
        }
    }

    public update(delta: number): void {
        this.lastSpeakTime += delta;
    }

    public shouldSpeak(): boolean {
        if (this.lastSpeakTime >= this.speakInterval) {
            this.lastSpeakTime = 0;
            // Randomize next interval
            this.speakInterval = 10000 + Math.random() * 20000;
            return true;
        }
        return false;
    }

    public generateMessage(): string {
        const index = Math.floor(Math.random() * this.phrases.length);
        return this.phrases[index];
    }
}