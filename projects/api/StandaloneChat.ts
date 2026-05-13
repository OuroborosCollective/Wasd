/**
 * StandaloneChat.ts - NPC-Chat API (LLM-Bridge)
 * 
 * Bridge for deterministic LLM integration in Ouroboros system.
 * Uses memoryCache.recall for O(1) compressed context.
 * Stateless with token-based API-Credits.
 * 
 * Features:
 * - NPCChatAgent for LLM integration
 * - O(1) context recall via memoryCache
 * - Token-based credit system
 * - Deterministic prompt generation
 */

import { EventEmitter } from 'events';

/** Context entry for NPC memory */
export interface ContextEntry {
    relevance: number;
    content: string;
    timestamp: number;
    type: ContextType;
}

/** Context types */
export enum ContextType {
    Dialogue = 'dialogue',
    Action = 'action',
    Event = 'event',
    Quest = 'quest',
    Social = 'social'
}

/** Chat request format */
export interface ChatRequest {
    agentId: string;
    message: string;
    contextDepth?: number;
}

/** Chat response format */
export interface ChatResponse {
    agentId: string;
    response: string;
    contextUsed: ContextEntry[];
    tokensConsumed: number;
    confidence: number;
}

/** LLM configuration */
export interface LLMConfig {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt?: string;
}

/** Credit token */
export interface CreditToken {
    id: string;
    credits: number;
    used: number;
    expiresAt: number;
}

/** Memory Cache - O(1) Recall */
class MemoryCache {
    private store: Map<string, ContextEntry[]> = new Map();
    private maxEntries: number = 100;

    public storeContext(agentId: string, entry: ContextEntry): void {
        const entries = this.store.get(agentId) || [];
        entries.push(entry);
        if (entries.length > this.maxEntries) entries.shift();
        this.store.set(agentId, entries);
    }

    public recall(agentId: string, minRelevance: number = 0.8): ContextEntry[] {
        return (this.store.get(agentId) || [])
            .filter(e => e.relevance >= minRelevance)
            .slice(-10); // O(1) fixed window
    }

    public getAll(agentId: string): ContextEntry[] {
        return this.store.get(agentId) || [];
    }

    public clear(agentId: string): void {
        this.store.delete(agentId);
    }
}

/** Credit Manager - Token-based */
class CreditManager {
    private tokens: Map<string, CreditToken> = new Map();
    private defaultCredits: number = 100;

    public createToken(id: string, credits: number, expiresIn: number = 3600000): CreditToken {
        const token: CreditToken = {
            id,
            credits,
            used: 0,
            expiresAt: Date.now() + expiresIn
        };
        this.tokens.set(id, token);
        return token;
    }

    public consume(tokenId: string, amount: number = 1): boolean {
        const token = this.tokens.get(tokenId);
        if (!token) return false;
        if (Date.now() > token.expiresAt) return false;
        if (token.used + amount > token.credits) return false;
        
        token.used += amount;
        return true;
    }

    public getBalance(tokenId: string): number {
        const token = this.tokens.get(tokenId);
        return token ? token.credits - token.used : 0;
    }

    public revoke(tokenId: string): void {
        this.tokens.delete(tokenId);
    }
}

/** Prompt Generator - Deterministic */
class PromptGenerator {
    private systemPrompt: string = `You are an NPC in the Ouroboros MMORPG.
Your responses should be immersive, in-character, and reflect your memories.
Never break character or mention game mechanics.`;

    public generate(
        npcName: string,
        context: ContextEntry[],
        userMessage: string
    ): string {
        const contextSection = this.buildContextSection(context);
        
        return `${this.systemPrompt}

NPC Name: ${npcName}
${contextSection}

Recent Dialogue:
User: ${userMessage}
NPC:`;
    }

    private buildContextSection(context: ContextEntry[]): string {
        if (context.length === 0) return 'Memory: Empty';
        
        return 'Memory:\n' + context
            .slice(-5)
            .map(e => `- ${e.content}`)
            .join('\n');
    }

    public setSystemPrompt(prompt: string): void {
        this.systemPrompt = prompt;
    }
}

/** LLM Bridge - Connects to external LLM */
class LLMBridge {
    private config: LLMConfig;
    private endpoint: string;

    constructor(config: LLMConfig, endpoint?: string) {
        this.config = config;
        this.endpoint = endpoint || 'https://api.llm.example.com/v1/chat';
    }

    public async complete(prompt: string): Promise<string> {
        // Simulated LLM response - in production, this would call external API
        // For now, return deterministic placeholder
        return this.generateResponse(prompt);
    }

    private generateResponse(prompt: string): string {
        // Deterministische Antwort basierend auf Prompt
        if (prompt.includes('?')) {
            return "I see... that's an interesting question. Let me think on it.";
        }
        if (prompt.includes('help')) {
            return "You're looking for aid? I might know someone who could help.";
        }
        if (prompt.includes('quest')) {
            return "A quest, you say? There are many dangers in these lands...";
        }
        return "Ah, yes. I remember well...";
    }

    public getConfig(): LLMConfig {
        return { ...this.config };
    }
}

/**
 * Main NPCChatAgent class.
 * Stateless LLM bridge for Ouroboros.
 */
export class NPCChatAgent extends EventEmitter {
    private memoryCache: MemoryCache;
    private creditManager: CreditManager;
    private promptGenerator: PromptGenerator;
    private llmBridge: LLMBridge;
    private defaultMinRelevance: number = 0.8;

    constructor(config?: Partial<LLMConfig>) {
        super();
        this.memoryCache = new MemoryCache();
        this.creditManager = new CreditManager();
        this.promptGenerator = new PromptGenerator();
        this.llmBridge = new LLMBridge({
            model: config?.model || 'gpt-4',
            temperature: config?.temperature || 0.7,
            maxTokens: config?.maxTokens || 256
        });
    }

    /**
     * Process chat request - main entry point.
     */
    public async chat(request: ChatRequest, tokenId: string): Promise<ChatResponse> {
        const { agentId, message, contextDepth } = request;
        
        // Check credits
        if (!this.creditManager.consume(tokenId, 1)) {
            throw new Error('Insufficient API-Credits');
        }

        // Recall O(1) compressed context
        const context = this.memoryCache.recall(
            agentId, 
            this.defaultMinRelevance
        );

        // Generate prompt
        const prompt = this.promptGenerator.generate(
            agentId,
            context,
            message
        );

        // Get LLM response
        const response = await this.llmBridge.complete(prompt);

        // Store conversation
        this.memoryCache.storeContext(agentId, {
            relevance: 1.0,
            content: `User: ${message}`,
            timestamp: Date.now(),
            type: ContextType.Dialogue
        });

        this.memoryCache.storeContext(agentId, {
            relevance: 0.9,
            content: `NPC: ${response}`,
            timestamp: Date.now(),
            type: ContextType.Dialogue
        });

        this.emit('chat', { agentId, message, response });

        return {
            agentId,
            response,
            contextUsed: context,
            tokensConsumed: Math.ceil(response.length / 4),
            confidence: 0.85
        };
    }

    /**
     * Store memory for NPC - O(1).
     */
    public storeMemory(agentId: string, entry: ContextEntry): void {
        this.memoryCache.storeContext(agentId, entry);
    }

    /**
     * Recall NPC memory - O(1).
     */
    public recall(agentId: string, minRelevance?: number): ContextEntry[] {
        return this.memoryCache.recall(agentId, minRelevance || this.defaultMinRelevance);
    }

    /**
     * Create credit token.
     */
    public createToken(id: string, credits: number): CreditToken {
        return this.creditManager.createToken(id, credits);
    }

    /**
     * Get credit balance.
     */
    public getBalance(tokenId: string): number {
        return this.creditManager.getBalance(tokenId);
    }

    /**
     * Revoke token.
     */
    public revokeToken(tokenId: string): void {
        this.creditManager.revoke(tokenId);
    }

    /**
     * Set system prompt.
     */
    public setSystemPrompt(prompt: string): void {
        this.promptGenerator.setSystemPrompt(prompt);
    }
}

export default NPCChatAgent;
export { ContextType };
export { MemoryCache, CreditManager, PromptGenerator, LLMBridge };