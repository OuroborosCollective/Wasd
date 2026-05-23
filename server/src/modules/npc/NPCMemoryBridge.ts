/**
 * NPCMemoryBridge.ts
 *
 * Verbindung zwischen Redis-Thinkinglogs und dem LLM.
 * Bereitet die Gedächtnis-Daten auf und generiert Zusammenfassungen für den LLM-Kontext.
 */

import { npcThinkingLog, ThinkingLogEntry } from "./NPCThinkingLogService.js";
import { llmConnector, LLMResponse } from "../ai/LLMConnector.js";

export interface NPCMemoryContext {
  npcId: string;
  npcName: string;
  personality: any;
  recentThoughts: ThinkingLogEntry[];
  memorySummary: string;
  worldState?: any;
}

export class NPCMemoryBridge {
  private static instance: NPCMemoryBridge;
  private summarizationCache: Map<string, { summary: string; timestamp: number }> = new Map();
  private SUMMARY_CACHE_TTL = 60000; // 60 Sekunden

  static getInstance(): NPCMemoryBridge {
    if (!NPCMemoryBridge.instance) {
      NPCMemoryBridge.instance = new NPCMemoryBridge();
    }
    return NPCMemoryBridge.instance;
  }

  /**
   * Liest die Thinkinglogs eines NPCs und erstellt einen Gedächtnis-Kontext für das LLM.
   */
  async buildMemoryContext(
    npcId: string,
    npcName: string,
    personality: any,
    worldState?: any,
    limit: number = 10
  ): Promise<NPCMemoryContext> {
    const recentThoughts = await npcThinkingLog.getThinkingLog(npcId, limit);
    const memorySummary = await this.generateMemorySummary(npcId, npcName, recentThoughts);

    return {
      npcId,
      npcName,
      personality,
      recentThoughts,
      memorySummary,
      worldState,
    };
  }

  /**
   * Generiert eine Zusammenfassung der Thinkinglogs mit Hilfe des LLM.
   * Nutzt Caching, um wiederholte Anfragen zu vermeiden.
   */
  private async generateMemorySummary(
    npcId: string,
    npcName: string,
    thoughts: ThinkingLogEntry[]
  ): Promise<string> {
    // Prüfe Cache
    const cached = this.summarizationCache.get(npcId);
    if (cached && Date.now() - cached.timestamp < this.SUMMARY_CACHE_TTL) {
      return cached.summary;
    }

    if (!llmConnector.isEnabled() || thoughts.length === 0) {
      // Fallback: Einfache Zusammenfassung ohne LLM
      return this.generateSimpleSummary(npcName, thoughts);
    }

    try {
      const thoughtsText = thoughts
        .slice(-5) // Nimm nur die letzten 5 Gedanken
        .map((t) => `[${new Date(t.timestamp).toLocaleTimeString()}] ${t.action}: ${t.thought}`)
        .join("\n");

      const systemPrompt = `Du bist ein Gedächtnis-Aggregator für einen NPC in einem MMORPG.
        Fasse die folgenden Gedanken und Aktionen des NPCs in 1-2 Sätzen zusammen.
        Fokussiere auf wichtige Ereignisse und Emotionen.`;

      const userPrompt = `NPC: ${npcName}
        Letzte Gedanken:
        ${thoughtsText}
        
        Gib eine kurze Zusammenfassung als JSON zurück: { "summary": "...", "mood": "neutral|happy|angry|confused" }`;

      const response = await llmConnector.queryLLM(systemPrompt, userPrompt, 0.5);

      if (response && response.summary) {
        this.summarizationCache.set(npcId, {
          summary: response.summary,
          timestamp: Date.now(),
        });
        return response.summary;
      }
    } catch (err: any) {
      console.warn(`[NPCMemoryBridge] Fehler bei der Gedächtnis-Zusammenfassung für ${npcName}:`, err.message);
    }

    // Fallback
    return this.generateSimpleSummary(npcName, thoughts);
  }

  /**
   * Einfache Zusammenfassung ohne LLM (Fallback).
   */
  private generateSimpleSummary(npcName: string, thoughts: ThinkingLogEntry[]): string {
    if (thoughts.length === 0) {
      return `${npcName} hat noch keine Gedanken aufgezeichnet.`;
    }

    const lastThought = thoughts[thoughts.length - 1];
    const actionCount = thoughts.reduce((acc, t) => {
      acc[t.action] = (acc[t.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topActions = Object.entries(actionCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([action]) => action)
      .join(", ");

    return `${npcName} war zuletzt damit beschäftigt, ${topActions} zu machen. Aktuell: ${lastThought.action}.`;
  }

  /**
   * Generiert einen System-Prompt für die NPC-Entscheidungsfindung basierend auf dem Gedächtnis-Kontext.
   */
  buildSystemPrompt(context: NPCMemoryContext): string {
    return `Du bist ein NPC in einem Fantasy-MMORPG namens Areloria.
      Dein Name: ${context.npcName}
      Deine Persönlichkeit: ${JSON.stringify(context.personality)}
      
      Dein Gedächtnis:
      ${context.memorySummary}
      
      Weltzustand:
      ${context.worldState ? JSON.stringify(context.worldState) : "Stabil"}
      
      Du triffst Entscheidungen basierend auf deinen Bedürfnissen, deiner Persönlichkeit und deinen Erfahrungen.
      Antworte immer mit einem JSON-Objekt: { "action": "wander|work|sleep|eat|interact", "thought": "...", "dialogText": "..." }`;
  }
}

export const npcMemoryBridge = NPCMemoryBridge.getInstance();
