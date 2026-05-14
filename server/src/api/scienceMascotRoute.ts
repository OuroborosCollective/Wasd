import express, { type Request, type Response, type Router } from "express";

/**
 * Google Gemini proxy for Science Portal mascot (Emily).
 * Env: GEMINI_API_KEY or GOOGLE_AI_API_KEY; optional GEMINI_MODEL (default gemini-1.5-flash).
 */
export function scienceMascotRouter(): Router {
  const r = express.Router();
  r.use(express.json({ limit: "256kb" }));

  r.options("/science-mascot", (_req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
  });

  r.post("/science-mascot", async (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    try {
      const body = req.body as {
        systemPrompt?: string;
        userMessage?: string;
        temperature?: number;
        maxOutputTokens?: number;
      };
      const systemPrompt = typeof body.systemPrompt === "string" ? body.systemPrompt : "";
      const userMessage = typeof body.userMessage === "string" ? body.userMessage : "";
      if (!systemPrompt.trim() || !userMessage.trim()) {
        res.status(400).json({ error: "systemPrompt and userMessage required" });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        res.status(503).json({
          error: "GEMINI_API_KEY not configured",
          fallback: true,
        });
        return;
      }

      const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const temperature = typeof body.temperature === "number" ? body.temperature : 0.45;
      const maxOutputTokens =
        typeof body.maxOutputTokens === "number" ? Math.min(1024, Math.max(64, body.maxOutputTokens)) : 512;

      const geminiBody = {
        systemInstruction: { parts: [{ text: systemPrompt.slice(0, 24000) }] },
        contents: [{ role: "user", parts: [{ text: userMessage.slice(0, 12000) }] }],
        generationConfig: {
          temperature,
          maxOutputTokens,
        },
      };

      const gr = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      });

      const json = (await gr.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        error?: { message?: string };
      };

      if (!gr.ok) {
        res.status(502).json({
          error: json?.error?.message || `Gemini HTTP ${gr.status}`,
          details: json,
        });
        return;
      }

      const text =
        json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";

      if (!text) {
        res.status(502).json({ error: "empty Gemini response", details: json });
        return;
      }

      res.json({ text });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  return r;
}
