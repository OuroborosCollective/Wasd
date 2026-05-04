// @ts-nocheck
import { NPCMemoryCache, MemoryEvent } from './NPCMemoryCache';
import { NPCTraits } from './NPCTraits';

export class NPCChatBridge {
    private memoryCache: NPCMemoryCache;

    constructor(memoryCache: NPCMemoryCache) {
        this.memoryCache = memoryCache;
    }

    public getContextualSystemPrompt(npcId: string, traits: NPCTraits): string {
        const events = this.memoryCache.getEvents(npcId);
        
        const weightedEvents = events.map(event => ({
            event,
            score: this.calculateEventScore(event, traits)
        }));

        const topEvents = weightedEvents
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(item => item.event);

        return this.transformToNaturalLanguage(topEvents);
    }

    private calculateEventScore(event: MemoryEvent, traits: NPCTraits): number {
        let baseScore = 1.0;

        // Weighting based on NPC Traits
        if (event.tags.includes('combat') || event.tags.includes('confrontation')) {
            baseScore += (traits.aggression * 2.5);
        }

        if (event.tags.includes('discovery') || event.tags.includes('information')) {
            baseScore += (traits.curiosity * 2.0);
        }

        if (event.tags.includes('danger') || event.tags.includes('risk')) {
            baseScore += (traits.courage * 1.8);
        }

        // Time decay (Recency bias)
        // Events within the last hour get a boost
        const oneHourInMs = 60 * 60 * 1000;
        const age = Date.now() - event.timestamp;
        const recencyFactor = Math.max(0, 1 - (age / (oneHourInMs * 24))); // Decay over 24h
        
        return baseScore + recencyFactor;
    }

    private transformToNaturalLanguage(events: MemoryEvent[]): string {
        if (events.length === 0) {
            return "You have no significant recent memories that influence your current state of mind.";
        }

        const memoryString = events
            .map(e => e.content)
            .join(" Furthermore, you remember: ");

        return `The following recent events are currently prominent in your mind and should influence your behavior and responses: ${memoryString}. Use this context to shape your attitude and what you choose to share.`;
    }

    public injectContextIntoPrompt(systemPrompt: string, npcId: string, traits: NPCTraits): string {
        const context = this.getContextualSystemPrompt(npcId, traits);
        return `${systemPrompt}\n\n[RECENT MEMORIES CONTEXT]\n${context}\n[END CONTEXT]`;
    }
}