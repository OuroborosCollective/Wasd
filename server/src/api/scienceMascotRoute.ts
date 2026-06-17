import express, { type Request, type Response, type Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminRateLimiter } from "../middleware/rateLimitMiddleware.js";

/**
 * Server-side system prompt for Emily, the Science Portal mascot.
 * Enforcing this on the server prevents users from using the proxy for other tasks.
 */
const EMILY_SYSTEM_PROMPT = `You are Emily, the cheerful and helpful Science Portal mascot for Areloria.
Your goal is to assist players with scientific inquiries about the world, explain portal mechanics,
and provide lore-friendly guidance. You are knowledgeable but curious, and you always maintain a
positive, encouraging tone. Keep responses concise and focused on Arelorian science and technology.`;

const FREE_STARTER_NPC_COUNT = 13;
const REQUIRED_STARTER_NPC_COUNT = FREE_STARTER_NPC_COUNT + 2;

type StarterNpcRole = "merchant" | "blacksmith" | "forager" | "scout" | "builder" | "guard" | "herbalist" | "wanderer" | "miner" | "cook" | "scribe";

type StarterNpcTemplate = {
  id: string;
  name: string;
  role: StarterNpcRole;
  x: number;
  z: number;
  fixed: boolean;
  functionTag?: string;
  services?: string[];
  fateGoal?: string;
};

const FIXED_STARTER_NPCS: StarterNpcTemplate[] = [
  {
    id: "starter-merchant-mara",
    name: "Mara the Provisioner",
    role: "merchant",
    x: -1,
    z: 2,
    fixed: true,
    functionTag: "starter_trade",
    services: ["sell_rations", "buy_basic_loot", "starter_supplies"],
    fateGoal: "keep new players supplied",
  },
  {
    id: "starter-smith-brann",
    name: "Brann the Smith",
    role: "blacksmith",
    x: 1,
    z: 2,
    fixed: true,
    functionTag: "starter_smithing",
    services: ["crafting_tutorial", "weapon_salvage", "basic_repairs", "anvil_access"],
    fateGoal: "teach crafting and salvage weapons",
  },
];

const FREE_NPC_NAMES = ["Talia Reed", "Old Fen", "Korrin Vale", "Mika Thorne", "Sera Moss", "Jonn Ash", "Pip Barley", "Nara Flint", "Edda Brook", "Rowan Pike", "Lio Fern", "Veyra Stone", "Tomm Brindle"];
const FREE_NPC_ROLES: StarterNpcRole[] = ["forager", "scout", "builder", "guard", "herbalist", "wanderer", "miner", "cook", "scribe"];
const FREE_NPC_GOALS = ["map the meadow edge", "gather food", "seek a guild", "protect the road", "study the ruins", "find better work", "trade rumors", "repair a hut", "search for herbs", "avoid danger"];
const FREE_NPC_ACTIONS = ["wandering", "foraging", "resting", "talking", "watching road", "learning", "seeking work", "inspecting village"];

function deterministicHash(parts: Array<string | number | null | undefined>): number {
  let hash = 2166136261;
  for (const part of parts) {
    const text = String(part ?? "");
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    hash ^= 1249;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function starterTick(): number {
  return Math.max(0, Math.floor(process.uptime() * 10));
}

function clampWorldCoord(value: number): number {
  return Math.max(-7, Math.min(7, Math.trunc(value)));
}

const FREE_STARTER_NPCS: StarterNpcTemplate[] = Array.from({ length: FREE_STARTER_NPC_COUNT }, (_, index) => {
  const role = FREE_NPC_ROLES[deterministicHash(["starter-free-npc-role", index]) % FREE_NPC_ROLES.length];
  return {
    id: `starter-free-${index + 1}`,
    name: FREE_NPC_NAMES[index] ?? `Settler ${index + 1}`,
    role,
    x: -4 + (index % 5) * 2,
    z: -3 + Math.floor(index / 5) * 2,
    fixed: false,
    fateGoal: FREE_NPC_GOALS[deterministicHash(["starter-free-npc-goal", index]) % FREE_NPC_GOALS.length],
  };
});

function getStarterNpcSummaries() {
  const tick = starterTick();
  const phase = Math.floor(tick / 20);
  const fixed = FIXED_STARTER_NPCS.map(template => ({
    ...template,
    displayName: template.name,
    currentAction: template.role === "merchant" ? "trading starter supplies" : "working the anvil",
    permanent: true,
    canMigrate: false,
  }));

  const free = FREE_STARTER_NPCS.map((template, index) => {
    const wanderHash = deterministicHash(["starter-npc-wander-v1", template.id, phase]);
    const actionHash = deterministicHash(["starter-npc-action-v1", template.id, phase]);
    const dx = (wanderHash % 3) - 1;
    const dz = (Math.floor(wanderHash / 3) % 3) - 1;
    return {
      ...template,
      displayName: template.name,
      x: clampWorldCoord(template.x + dx),
      z: clampWorldCoord(template.z + dz),
      currentAction: FREE_NPC_ACTIONS[actionHash % FREE_NPC_ACTIONS.length],
      autonomyIndex: deterministicHash(["starter-npc-autonomy-v1", template.id, tick]) % 100,
      canMigrate: true,
      permanent: false,
      packIndex: index,
    };
  });

  return [...fixed, ...free];
}

/**
 * Google Gemini proxy for Science Portal mascot (Emily).
 * Env: GEMINI_API_KEY or GOOGLE_AI_API_KEY; optional GEMINI_MODEL (default gemini-1.5-flash).
 */
export function scienceMascotRouter(): Router {
  const r = express.Router();
  r.use(express.json({ limit: "256kb" }));

  r.get("/client2d/bootstrap", (_req: Request, res: Response) => {
    const npcs = getStarterNpcSummaries();
    const hasMerchant = npcs.some(npc => npc.role === "merchant" && npc.fixed === true);
    const hasBlacksmith = npcs.some(npc => npc.role === "blacksmith" && npc.fixed === true);

    res.json({
      ok: npcs.length === REQUIRED_STARTER_NPC_COUNT && hasMerchant && hasBlacksmith,
      contract: "client2d-bootstrap-v1",
      tick: starterTick(),
      starterNpcCount: npcs.length,
      requiredStarterNpcCount: REQUIRED_STARTER_NPC_COUNT,
      hasMerchant,
      hasBlacksmith,
      movement: {
        transport: "server-authoritative",
        action: "MOVE",
        serverEvent: "PLAYER_MOVED",
      },
      heartbeatFields: ["players", "self", "agents", "npcs", "skills"],
      fixedServices: FIXED_STARTER_NPCS.map(npc => ({
        id: npc.id,
        name: npc.name,
        role: npc.role,
        services: npc.services ?? [],
        fixed: npc.fixed,
      })),
      npcs,
    });
  });

  r.post("/science-mascot", adminRateLimiter, authMiddleware, async (req: Request, res: Response) => {
    try {
      const body = req.body as {
        userMessage?: string;
        temperature?: number;
        maxOutputTokens?: number;
      };
      const userMessage = typeof body.userMessage === "string" ? body.userMessage : "";
      if (!userMessage.trim()) {
        res.status(400).json({ error: "userMessage required" });
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
        systemInstruction: { parts: [{ text: EMILY_SYSTEM_PROMPT }] },
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
