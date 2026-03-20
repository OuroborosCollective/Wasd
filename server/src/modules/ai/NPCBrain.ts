/**
 * NPCBrain.ts
 *
 * Hybrid-Entscheidungslogik für NPCs:
 * - Kritische Bedürfnisse (Hunger/Energie < 20): Schneller Behavior Tree
 * - Komplexere Zustände: LLM-basierte Entscheidungsfindung mit Gedächtnis
 */

import { BehaviorTree, BrainDecision } from "./BehaviorTree.js";
import { llmConnector } from "./LLMConnector.js";
import { npcMemoryBridge } from "../npc/NPCMemoryBridge.js";

export class NPCBrain {
  private tree = new BehaviorTree();
  private lastLLMQueryTime: number = 0;
  private LLM_QUERY_INTERVAL = 30000; // Mindestens 30 Sekunden zwischen LLM-Anfragen
  private llmEnabled: boolean;

  constructor() {
    this.llmEnabled = llmConnector.isEnabled();
  }

  /**
   * Hybrid-Update: Kritische Bedürfnisse nutzen den schnellen BehaviorTree,
   * komplexere Zustände nutzen das LLM mit Gedächtnis.
   */
  async update(npc: any): Promise<BrainDecision> {
    // 1. Kritische Bedürfnisse: Schneller Behavior Tree (Performance-kritisch)
    if (npc.needs?.energy < 20 || npc.needs?.hunger < 20) {
      const decision = this.tree.run(npc);
      npc.currentAction = decision.action;
      return decision;
    }

    // 2. Komplexere Zustände: LLM-basierte Entscheidung (mit Fallback)
    if (this.llmEnabled && this.shouldQueryLLM()) {
      const decision = await this.queryLLMForDecision(npc);
      if (decision) {
        npc.currentAction = decision.action;
        return decision;
      }
    }

    // 3. Fallback: Behavior Tree
    const decision = this.tree.run(npc);
    npc.currentAction = decision.action;
    return decision;
  }

  /**
   * Prüft, ob genug Zeit seit der letzten LLM-Anfrage vergangen ist.
   */
  private shouldQueryLLM(): boolean {
    const now = Date.now();
    if (now - this.lastLLMQueryTime >= this.LLM_QUERY_INTERVAL) {
      this.lastLLMQueryTime = now;
      return true;
    }
    return false;
  }

  /**
   * Fragt das LLM basierend auf dem NPC-Gedächtnis nach der nächsten Aktion.
   */
  private async queryLLMForDecision(npc: any): Promise<BrainDecision | null> {
    try {
      // Baue den Gedächtnis-Kontext auf
      const context = await npcMemoryBridge.buildMemoryContext(
        npc.id,
        npc.name,
        npc.personality,
        { centerValue: 0.5 }, // Vereinfacht; könnte vom WorldBrain kommen
        10
      );

      // Generiere den System-Prompt
      const systemPrompt = npcMemoryBridge.buildSystemPrompt(context);

      // User-Prompt mit aktuellem Zustand
      const userPrompt = `Deine aktuellen Bedürfnisse: Hunger ${npc.needs?.hunger || 100}/100, Energie ${npc.needs?.energy || 100}/100.
        Dein aktueller Status: ${npc.state}.
        
        Was ist deine nächste Aktion? Antworte mit JSON: { "action": "...", "thought": "...", "dialogText": "..." }`;

      // Frage das LLM
      const response = await llmConnector.queryLLM(systemPrompt, userPrompt, 0.7);

      if (response) {
        return {
          action: response.action || "wander",
          thought: response.thought || "Ich überlege, was ich als nächstes tun soll.",
        };
      }
    } catch (err: any) {
      if (process.env.NODE_ENV !== "production") {
        console.debug(`[NPCBrain] Fehler bei LLM-Abfrage für NPC ${npc.name}:`, err.message);
      }
    }

    return null; // Fallback zum BehaviorTree
  }
}
