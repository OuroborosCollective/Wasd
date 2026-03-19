/**
 * LLMConnector.ts
 *
 * Stellt eine Schnittstelle zu Large Language Models (LLMs) wie OpenAI oder Google Gemini bereit.
 * Verwaltet die API-Schlüssel und die Modellkonfiguration.
 * Implementiert Fallbacks und Fehlerbehandlung für LLM-Aufrufe.
 */

import OpenAI from "openai";

export interface LLMResponse {
  action: string;
  thought: string;
  dialogText?: string;
  summary?: string;
}

export class LLMConnector {
  private openai: OpenAI | null = null;
  private model: string;
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.LLM_ENABLED === "true";
    this.model = process.env.LLM_MODEL || "gpt-4o-mini"; // Standardmodell

    if (this.enabled && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      console.log(`[LLMConnector] OpenAI-Client initialisiert mit Modell: ${this.model}`);
    } else if (this.enabled && process.env.GEMINI_API_KEY) {
      // TODO: Implement Gemini API integration if needed
      console.warn("[LLMConnector] Gemini API-Key gefunden, aber Integration noch nicht implementiert.");
      this.enabled = false; // Deaktivieren, da nicht implementiert
    } else {
      this.enabled = false;
      console.warn("[LLMConnector] LLM ist deaktiviert (LLM_ENABLED=false oder kein API-Key gefunden).");
    }
  }

  /**
   * Sendet einen Prompt an das konfigurierte LLM und gibt eine strukturierte Antwort zurück.
   * @param systemPrompt - Der System-Prompt für das LLM.
   * @param userPrompt - Der User-Prompt mit den spezifischen Informationen.
   * @param temperature - Die Kreativität des LLM (0.0 - 1.0).
   * @returns Eine strukturierte LLMResponse oder null bei Fehler/Deaktivierung.
   */
  async queryLLM(
    systemPrompt: string,
    userPrompt: string,
    temperature: number = 0.7
  ): Promise<LLMResponse | null> {
    if (!this.enabled || !this.openai) {
      return null;
    }

    try {
      const chatCompletion = await this.openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: this.model,
        temperature: temperature,
        response_format: { type: "json_object" }, // Wichtig für strukturierte Ausgabe
      });

      const responseContent = chatCompletion.choices[0]?.message?.content;
      if (responseContent) {
        try {
          const parsedResponse: LLMResponse = JSON.parse(responseContent);
          return parsedResponse;
        } catch (jsonError) {
          console.error("[LLMConnector] Fehler beim Parsen der LLM-Antwort (kein gültiges JSON):", responseContent);
          return null;
        }
      }
      return null;
    } catch (error: any) {
      console.error("[LLMConnector] Fehler beim Aufruf der LLM-API:", error.message);
      return null;
    }
  }

  /**
   * Prüft, ob der LLM-Connector aktiv ist.
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton-Instanz
export const llmConnector = new LLMConnector();
