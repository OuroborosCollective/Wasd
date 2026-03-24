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

    // LLM standardmäßig deaktivieren, um API-Rate-Limits zu vermeiden
    this.enabled = false;
    console.warn("[LLMConnector] LLM wurde manuell deaktiviert, um API-Rate-Limits zu vermeiden.");
    return;
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
