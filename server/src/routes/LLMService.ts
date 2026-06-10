/**
 * LLMService.ts - Phase 11: Ouroboros Tick System Integration
 * 
 * LLM wrapper for mlvocka/polling.ai integration.
 * Uses deterministic tick context for Ouroboros integration.
 */

import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";

export interface LLMRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  text: string;
  model: string;
  tickId: number;
  seedHash: string;
}

/**
 * LLMService - Wrapper for LLM calls with deterministic context
 */
export class LLMService {
  private static readonly DEFAULT_MODEL = 'mlvocka';
  private static readonly POLLING_AI_BASE_URL = 'https://api.polling.ai/v1';

  /**
   * Generate text from LLM with Ouroboros tick context
   */
  static async generate(request: LLMRequest): Promise<LLMResponse> {
    const tickContext = tickContextProvider.getContext();
    
    // In production, this would call the actual LLM API
    // For now, we return a deterministic response based on tick context
    const model = request.model || LLMService.DEFAULT_MODEL;
    
    // Generate deterministic response based on seedHash
    const deterministicSeed = this.deriveDeterministicResponse(
      request.prompt,
      tickContext.seedHash,
      request.temperature || 0.7
    );
    
    return {
      text: deterministicSeed,
      model,
      tickId: tickContext.tickId,
      seedHash: tickContext.seedHash,
    };
  }

  /**
   * Derive a deterministic response from prompt and seed
   * Uses FNV-1a hash for stable deterministic generation
   */
  private static deriveDeterministicResponse(
    prompt: string,
    seedHash: string,
    temperature: number
  ): string {
    // Create a deterministic hash from prompt + seed
    const combined = `${prompt}|${seedHash}|${temperature}`;
    let hash = 2166136261;
    const prime = 16777619;
    
    for (let i = 0; i < combined.length; i++) {
      hash ^= combined.charCodeAt(i);
      hash = Math.imul(hash, prime);
    }
    
    // Convert hash to deterministic response
    const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
    return `[OUROBOROS deterministic response from seed ${hashHex.slice(0, 8)}]`;
  }

  /**
   * Generate with actual polling.ai API call
   */
  static async generateWithPollingAI(request: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env.POLLING_AI_API_KEY;
    
    if (!apiKey) {
      // Fall back to deterministic generation
      return this.generate(request);
    }
    
    const tickContext = tickContextProvider.getContext();
    
    try {
      const response = await fetch(`${LLMService.POLLING_AI_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt: request.prompt,
          model: request.model || LLMService.DEFAULT_MODEL,
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 1024,
          seed: tickContext.seedHash.slice(0, 16), // Use deterministic seed
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Polling AI API error: ${response.status}`);
      }
      
      const data = await response.json() as any;
      
      return {
        text: data.text || data.content || '',
        model: request.model || LLMService.DEFAULT_MODEL,
        tickId: tickContext.tickId,
        seedHash: tickContext.seedHash,
      };
    } catch (error) {
      console.error('[LLMService] Polling AI call failed, falling back to deterministic:', error);
      return this.generate(request);
    }
  }
}