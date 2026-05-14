import type { VisualThemeState } from "@wasd/shared";
import { PortalNPCChatBridge } from "../world/PortalNPCChatBridge";
import type { MascotWorldSnapshot } from "../world/PortalNPCChatBridge";

export type MascotReplySource = "gemini" | "local";

export interface MascotChatResult {
  text: string;
  source: MascotReplySource;
}

function localEmilyFallback(userMessage: string, snap: MascotWorldSnapshot): string {
  const fire = snap.themeMode === "fire_glitch";
  const echoHint =
    snap.echoes[0]?.summary?.slice(0, 80) ?? "no head echo";
  if (fire) {
    return [
      `Δhazard=${snap.hazardIndex.toFixed(2)} | trend=${snap.aggressionTrend.toFixed(4)} | head:${echoHint}`,
      `Q: ${userMessage.slice(0, 120)} → route: stabilize mesh; log combat echo; reduce exposure.`,
    ].join("\n");
  }
  return [
    `Telemetry (marina band): hazard_index=${snap.hazardIndex.toFixed(3)}, aggression_trend=${snap.aggressionTrend.toFixed(5)}.`,
    `Latest echo trace: ${echoHint}.`,
    `On your question (“${userMessage.slice(0, 200)}”): analytically, prioritize echo correlation over raw hazard spikes unless sustained >3 ticks.`,
  ].join(" ");
}

async function callGeminiProxy(
  systemPrompt: string,
  userMessage: string,
  temperature: number,
  maxOutputTokens: number,
): Promise<string | null> {
  const base = (import.meta.env.VITE_WASD_API_BASE ?? "").replace(/\/$/, "");
  if (!base) return null;

  const res = await fetch(`${base}/api/v1/science-mascot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt,
      userMessage,
      temperature,
      maxOutputTokens,
    }),
  });
  const data = (await res.json()) as { text?: string; error?: string; fallback?: boolean };
  if (!res.ok || !data.text) {
    return null;
  }
  return data.text;
}

/**
 * Emily / Gemini — world-aware mascot completion.
 * Prefer server proxy (`VITE_WASD_API_BASE` + `GEMINI_API_KEY` on server); else local heuristic Emily.
 */
export async function completeScienceMascotChat(
  userMessage: string,
  visual: VisualThemeState,
): Promise<MascotChatResult> {
  const bridge = PortalNPCChatBridge.getInstance();
  const system = bridge.injectMascotSystemPrompt(visual);
  const snap = bridge.getWorldSnapshot(visual);
  const fire = visual.mode === "fire_glitch";
  const temperature = fire ? 0.62 : 0.38;
  const maxOutputTokens = fire ? 220 : 720;

  try {
    const remote = await callGeminiProxy(system, userMessage, temperature, maxOutputTokens);
    if (remote && remote.trim().length > 0) {
      return { text: remote.trim(), source: "gemini" };
    }
  } catch {
    /* fall through */
  }

  return { text: localEmilyFallback(userMessage, snap), source: "local" };
}
