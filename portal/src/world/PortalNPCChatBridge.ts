import type { VisualThemeState } from "@wasd/shared";
import { PortalWorldHistory, type WorldEcho } from "./PortalWorldHistory";

export type MascotWorldSnapshot = {
  hazardIndex: number;
  aggressionTrend: number;
  themeMode: VisualThemeState["mode"];
  echoes: WorldEcho[];
};

const EMILY_BASE =
  "You are Emily, sovereign mascot intelligence of the Ouroboros Science Portal. You sense live world telemetry and quest echoes.";

/**
 * Portal-side twin of {@link NPCChatBridge} — binds mascot prompts to
 * {@link PortalWorldHistory} + ThemeEngine state (hazard / mode).
 */
export class PortalNPCChatBridge {
  private static inst: PortalNPCChatBridge | null = null;

  static getInstance(): PortalNPCChatBridge {
    if (!PortalNPCChatBridge.inst) {
      PortalNPCChatBridge.inst = new PortalNPCChatBridge();
    }
    return PortalNPCChatBridge.inst;
  }

  static resetForTests(): void {
    PortalNPCChatBridge.inst = null;
  }

  getWorldSnapshot(visual: VisualThemeState): MascotWorldSnapshot {
    const echoes = PortalWorldHistory.getInstance().snapshotRecent(5);
    return {
      hazardIndex: visual.hazardIndex,
      aggressionTrend: visual.aggressionTrend,
      themeMode: visual.mode,
      echoes,
    };
  }

  buildPersonalityDirective(mode: VisualThemeState["mode"]): string {
    if (mode === "fire_glitch") {
      return [
        "[EMILY_PERSONA — FIRE_GLITCH]",
        "Hazard / combat resonance HIGH. Respond in ≤2 short sentences. Staccato. Dense technical shorthand (Hz, Δhazard, RFI, lockstep).",
        "No zen metaphors. German + English mix allowed. Urgency without panic.",
      ].join("\n");
    }
    if (mode === "marina") {
      return [
        "[EMILY_PERSONA — MARINA / CYBER_ZEN]",
        "Telemetry calm. Analytical, reflective, precise. You may use longer sentences and careful reasoning.",
        "Tie conclusions to echo arcs and hazard drift when relevant.",
      ].join("\n");
    }
    return [
      "[EMILY_PERSONA — BALANCED]",
        "Measured operator tone: concise but complete; blend technical clarity with light metaphor only if it aids understanding.",
    ].join("\n");
  }

  buildWorldTelemetryBlock(visual: VisualThemeState): string {
    const snap = this.getWorldSnapshot(visual);
    const echoLines =
      snap.echoes.length > 0
        ? snap.echoes.map((e) => `- [${e.kind}] ${e.summary}`).join("\n")
        : "(no recent echo events in PortalWorldHistory)";
    return [
      "[PORTAL_WORLD_TELEMETRY]",
      `hazard_index: ${snap.hazardIndex.toFixed(4)}`,
      `aggression_trend: ${snap.aggressionTrend.toFixed(6)}`,
      `visual_theme_mode: ${snap.themeMode}`,
      "last_5_echo_events:",
      echoLines,
      "[END_PORTAL_WORLD]",
    ].join("\n");
  }

  /** Same layering idea as server `NPCChatBridge.injectContextIntoPrompt`. */
  injectMascotSystemPrompt(visual: VisualThemeState, base = EMILY_BASE): string {
    const persona = this.buildPersonalityDirective(visual.mode);
    const world = this.buildWorldTelemetryBlock(visual);
    return `${base}\n\n${persona}\n\n${world}`;
  }
}

export const portalNpcChatBridge = PortalNPCChatBridge.getInstance();
