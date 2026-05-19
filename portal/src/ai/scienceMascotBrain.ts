import type { VisualThemeState } from "@wasd/shared";
import { PortalNPCChatBridge } from "../world/PortalNPCChatBridge";
import type { MascotWorldSnapshot } from "../world/PortalNPCChatBridge";

export type MascotReplySource = "gemini" | "local";

export interface MascotChatResult {
  text: string;
  source: MascotReplySource;
}

interface OracleProphecy {
  id?: string;
  active?: boolean;
  type?: string;
  kind?: string;
  sector?: string | number;
  sectorId?: string;
  severity?: number;
  confidence?: number;
  predictedInTicks?: number;
  message?: string;
  summary?: string;
}

interface OracleReportResponse {
  ok?: boolean;
  oracle?: {
    generatedAtTick?: number;
    prophecies?: OracleProphecy[];
    patterns?: unknown[];
  } | null;
}

interface GovernanceReportResponse {
  ok?: boolean;
  activeDirectives?: unknown[];
  openDirectives?: unknown[];
  directives?: unknown[];
  participation?: number;
}

interface RepairStatusResponse {
  ok?: boolean;
  autoRepair?: {
    active?: boolean;
    lastPlan?: { severity?: number; sector?: number; summary?: string; message?: string } | null;
    totalRepairs?: number;
    totalRollbacks?: number;
  } | null;
}

interface BillingStatusResponse {
  ok?: boolean;
  usage?: { hashesInWindow?: number; windowMs?: number } | null;
  cost?: { credits?: number; creditsPerMinute?: number } | null;
  billing?: { suspended?: boolean; message?: string | null } | null;
  market?: { totalCredits?: number; activeClients?: number } | null;
}

interface OracleContext {
  oracle: OracleReportResponse | null;
  governance: GovernanceReportResponse | null;
  repair: RepairStatusResponse | null;
  billing: BillingStatusResponse | null;
}

function apiBase(): string {
  return (import.meta.env.VITE_WASD_API_BASE ?? "").replace(/\/$/, "");
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const base = apiBase();
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchOracleContext(): Promise<OracleContext> {
  const [oracle, governance, repair, billing] = await Promise.all([
    fetchJson<OracleReportResponse>("/api/are/replay/oracle/prophecy"),
    fetchJson<GovernanceReportResponse>("/api/are/replay/governance/status"),
    fetchJson<RepairStatusResponse>("/api/are/replay/repair/status"),
    fetchJson<BillingStatusResponse>("/api/are/replay/billing/status"),
  ]);
  return { oracle, governance, repair, billing };
}

function summarizeOracleContext(ctx: OracleContext): string {
  const prophecies = ctx.oracle?.oracle?.prophecies ?? [];
  const active = prophecies.filter((p) => p.active !== false);
  const top = [...active].sort((a, b) => Number(b.severity ?? b.confidence ?? 0) - Number(a.severity ?? a.confidence ?? 0)).slice(0, 3);
  const prophecyText = top.length
    ? top
        .map((p, i) => {
          const sev = Number(p.severity ?? p.confidence ?? 0).toFixed(2);
          const sector = p.sectorId ?? p.sector ?? "unknown";
          const msg = p.message ?? p.summary ?? p.type ?? p.kind ?? "unlabeled prophecy";
          const eta = typeof p.predictedInTicks === "number" ? ` in ${p.predictedInTicks} ticks` : "";
          return `${i + 1}. ${msg} · sector=${sector} · severity=${sev}${eta}`;
        })
        .join("\n")
    : "no active prophecy";

  const directiveCount =
    Number((ctx.governance?.activeDirectives as unknown[] | undefined)?.length ?? 0) +
    Number((ctx.governance?.openDirectives as unknown[] | undefined)?.length ?? 0) +
    Number((ctx.governance?.directives as unknown[] | undefined)?.length ?? 0);
  const repairPlan = ctx.repair?.autoRepair?.lastPlan;
  const repairText = repairPlan
    ? `repair=${repairPlan.summary ?? repairPlan.message ?? "plan active"} severity=${Number(repairPlan.severity ?? 0).toFixed(2)} sector=${repairPlan.sector ?? "unknown"}`
    : `repair=${ctx.repair?.autoRepair?.active ? "active" : "idle"}`;
  const billingText = ctx.billing?.ok
    ? `billing=suspended:${Boolean(ctx.billing.billing?.suspended)} hashes=${ctx.billing.usage?.hashesInWindow ?? 0} credits=${ctx.billing.cost?.credits ?? ctx.billing.cost?.creditsPerMinute ?? 0}`
    : "billing=unknown";

  return [
    `Oracle generatedAtTick=${ctx.oracle?.oracle?.generatedAtTick ?? "unknown"}`,
    `Prophecies:\n${prophecyText}`,
    `Governance directives=${directiveCount} participation=${ctx.governance?.participation ?? 0}`,
    repairText,
    billingText,
  ].join("\n");
}

function localEmilyFallback(userMessage: string, snap: MascotWorldSnapshot, oracleContext?: OracleContext): string {
  const fire = snap.themeMode === "fire_glitch";
  const echoHint = snap.echoes[0]?.summary?.slice(0, 80) ?? "no head echo";
  const oracleSummary = oracleContext ? summarizeOracleContext(oracleContext) : "Oracle context unavailable.";
  const prophecies = oracleContext?.oracle?.oracle?.prophecies ?? [];
  const activeProphecy = [...prophecies]
    .filter((p) => p.active !== false)
    .sort((a, b) => Number(b.severity ?? b.confidence ?? 0) - Number(a.severity ?? a.confidence ?? 0))[0];

  if (/orakel|oracle|prophe|vorhersage|prediction|zukunft|riss/i.test(userMessage)) {
    const msg = activeProphecy?.message ?? activeProphecy?.summary ?? activeProphecy?.type ?? activeProphecy?.kind ?? "Keine aktive Prophezeiung im Recorder-Fenster.";
    const sector = activeProphecy?.sectorId ?? activeProphecy?.sector ?? "unbekannt";
    const sev = Number(activeProphecy?.severity ?? activeProphecy?.confidence ?? 0).toFixed(2);
    return [
      `Emily-Orakel: ${msg}`,
      `Sektor=${sector} · Severity=${sev} · Theme=${snap.themeMode} · hazard=${snap.hazardIndex.toFixed(2)}.`,
      `Begründung: Ich lese nur Recorder/Oracle/Governance/Repair-Telemetrie, kein Raten.`,
      oracleSummary,
    ].join("\n");
  }

  if (snap.adrenalineFlag) {
    return [
      `⚡ CRIT SPIKE: ${snap.combatReceptor.lastDamageSpike}dmg | total_crits=${snap.combatReceptor.critCount} | hazard=${snap.hazardIndex.toFixed(2)}`,
      `Threat vector aktiv. ${echoHint}. Adrenalin-Protokoll läuft.`,
      oracleSummary,
    ].join("\n");
  }

  if (fire) {
    return [
      `Δhazard=${snap.hazardIndex.toFixed(2)} | trend=${snap.aggressionTrend.toFixed(4)} | head:${echoHint}`,
      `Q: ${userMessage.slice(0, 120)} → route: stabilize mesh; log combat echo; reduce exposure.`,
      oracleSummary,
    ].join("\n");
  }
  return [
    `Telemetry: hazard_index=${snap.hazardIndex.toFixed(3)}, aggression_trend=${snap.aggressionTrend.toFixed(5)}.`,
    `Latest echo trace: ${echoHint}.`,
    `Oracle context:\n${oracleSummary}`,
    `On your question (“${userMessage.slice(0, 200)}”): prioritize deterministic prophecy + echo correlation over raw hazard spikes unless sustained >3 ticks.`,
  ].join("\n");
}

async function callGeminiProxy(
  systemPrompt: string,
  userMessage: string,
  temperature: number,
  maxOutputTokens: number,
): Promise<string | null> {
  const base = apiBase();
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
  if (!res.ok || !data.text) return null;
  return data.text;
}

/**
 * Emily / Gemini — world-aware mascot completion.
 * Prefer server proxy (`VITE_WASD_API_BASE` + `GEMINI_API_KEY` on server); else local deterministic Emily.
 */
export async function completeScienceMascotChat(
  userMessage: string,
  visual: VisualThemeState,
): Promise<MascotChatResult> {
  const bridge = PortalNPCChatBridge.getInstance();
  const snap = bridge.getWorldSnapshot(visual);
  const oracleContext = await fetchOracleContext();
  const oracleSummary = summarizeOracleContext(oracleContext);
  const system = `${bridge.injectMascotSystemPrompt(visual)}\n\nDETERMINISTIC_ORACLE_CONTEXT:\n${oracleSummary}\n\nRules: Explain predictions as Recorder/Oracle-derived causal traces. Do not invent prophecy data that is not present in this context.`;
  const fire = visual.mode === "fire_glitch";
  const temperature = fire ? 0.42 : 0.18;
  const maxOutputTokens = fire ? 260 : 840;

  try {
    const remote = await callGeminiProxy(system, userMessage, temperature, maxOutputTokens);
    if (remote && remote.trim().length > 0) return { text: remote.trim(), source: "gemini" };
  } catch {
    /* fall through */
  }

  return { text: localEmilyFallback(userMessage, snap, oracleContext), source: "local" };
}
