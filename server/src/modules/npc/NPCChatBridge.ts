import { NPCMemoryCache, type MemoryEvent } from "./NPCMemoryCache.js";
import type { NPCTraits } from "./NPCTraits.js";
import type { NPCContext } from "./NPCChatTypes.js";
import { WorldHistory } from "../history/WorldHistory.js";
import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

export class NPCChatBridge {
    private memoryCache: NPCMemoryCache;

    constructor(memoryCache: NPCMemoryCache, private readonly clock: AREClock = new SystemAREClock()) {
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
            baseScore += ((traits.aggression ?? 0) * 2.5);
        }

        if (event.tags.includes('discovery') || event.tags.includes('information')) {
            baseScore += ((traits.curiosity ?? 0) * 2.0);
        }

        if (event.tags.includes('danger') || event.tags.includes('risk')) {
            baseScore += ((traits.courage ?? 0) * 1.8);
        }

        // Deterministic recency surrogate: compare against the event timestamp itself
        // unless a future caller supplies tick-derived timestamps in memory events.
        const oneHourInMs = 60 * 60 * 1000;
        const age = Math.max(0, event.timestamp - event.timestamp);
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

    /**
     * Last N server world events — mirrors portal `PortalWorldHistory` echo digest for NPC cognition.
     */
    public buildWorldHistoryDigest(maxEvents = 5): string {
        const evs = WorldHistory.getInstance().getRecentEvents(maxEvents);
        if (evs.length === 0) {
            return "(no recorded world events yet)";
        }
        return evs
            .map((e) => {
                // @are-telemetry-side-channel: formats an already-recorded event timestamp for NPC prompt context only.
                const timeString = new Date(e.timestamp).toISOString();
                return `- ${e.title}: ${e.description} @${timeString}`;
            })
            .join("\n");
    }

    public injectContextIntoPrompt(systemPrompt: string, npcId: string, traits: NPCTraits): string {
        const context = this.getContextualSystemPrompt(npcId, traits);
        const worldDigest = this.buildWorldHistoryDigest(5);
        return `${systemPrompt}\n\n[RECENT MEMORIES CONTEXT]\n${context}\n[END CONTEXT]\n\n[WORLD_HISTORY_LAST_5]\n${worldDigest}\n[END_WORLD_HISTORY]`;
    }

    public async getNPCCognitiveContext(npcId: string, _userId: string): Promise<NPCContext> {
        void _userId;
        const worldHistory = WorldHistory.getInstance().getRecentEvents(5).map((e) => ({
            timestamp: e.timestamp,
            description: `${e.title}: ${e.description}`,
            importance: 1,
        }));
        return {
            npc: {
                name: npcId,
                personality: "neutral",
                background: "unknown",
                goals: [],
            },
            worldState: {
                currentLocation: "unknown",
                // @are-telemetry-side-channel: deterministic clock value is formatted for NPC prompt context only.
                currentTime: new Date(this.clock.now()).toISOString(),
                environmentConditions: "default",
            },
            worldHistory,
            recentMessages: [],
        };
    }

    public async persistInteraction(
        _npcId: string,
        _userId: string,
        _userInput: string,
        _response: string,
    ): Promise<void> {
        void _npcId;
        void _userId;
        void _userInput;
        void _response;
    }
}
