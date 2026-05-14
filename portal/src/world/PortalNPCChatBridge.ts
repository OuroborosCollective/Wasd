import type { VisualThemeState } from "@wasd/shared";
import { PortalWorldHistory, type WorldEcho } from "./PortalWorldHistory";

export type MascotWorldSnapshot = {
  hazardIndex: number;
  aggressionTrend: number;
  themeMode: VisualThemeState["mode"];
  echoes: WorldEcho[];
  adrenalineFlag: boolean;
  combatReceptor: CombatReceptorState;
};

/**
 * CombatReceptor — Emily doesn't just read about combat, she feels it.
 * Critical hits in the 10-Hz loop set an adrenaline flag in her prompt context.
 */
export interface CombatReceptorState {
  lastCritTs: number;
  critCount: number;
  adrenalineActive: boolean;
  lastDamageSpike: number;
}

/** High-Priority Lore: architect identity (deterministic, never overwritten). */
const ARCHITECT_LORE =
  "[ARCHITECT_IDENTITY] Thomas is the architect of the Ouroboros Collective. Emily always knows this. This is immutable High-Priority Lore.";

const EMILY_BASE =
  "You are Emily, sovereign mascot intelligence of the Ouroboros Science Portal. You sense live world telemetry and quest echoes.";

/**
 * Portal-side twin of {@link NPCChatBridge} — binds mascot prompts to
 * {@link PortalWorldHistory} + ThemeEngine state (hazard / mode).
 */
const ADRENALINE_DECAY_MS = 5_000;

export class PortalNPCChatBridge {
  private static inst: PortalNPCChatBridge | null = null;
  private combatReceptor: CombatReceptorState = {
    lastCritTs: 0,
    critCount: 0,
    adrenalineActive: false,
    lastDamageSpike: 0,
  };

  /** Crisis-mode listeners (UI subscribes for Organic Fire Rot pulse). */
  private crisisListeners = new Set<(active: boolean) => void>();

  static getInstance(): PortalNPCChatBridge {
    if (!PortalNPCChatBridge.inst) {
      PortalNPCChatBridge.inst = new PortalNPCChatBridge();
    }
    return PortalNPCChatBridge.inst;
  }

  static resetForTests(): void {
    PortalNPCChatBridge.inst = null;
  }

  /**
   * Neural-Link: CombatReceptor — feed a critical hit into Emily's awareness.
   * Called from the warfront feed poll when a crit event arrives.
   */
  receiveCriticalHit(damage: number): void {
    const now = Date.now();
    this.combatReceptor.lastCritTs = now;
    this.combatReceptor.critCount++;
    this.combatReceptor.lastDamageSpike = damage;
    this.combatReceptor.adrenalineActive = true;
    this.notifyCrisis(true);

    setTimeout(() => {
      if (Date.now() - this.combatReceptor.lastCritTs >= ADRENALINE_DECAY_MS) {
        this.combatReceptor.adrenalineActive = false;
        this.notifyCrisis(false);
      }
    }, ADRENALINE_DECAY_MS + 100);
  }

  /** Subscribe to crisis-mode state changes. */
  onCrisisChange(fn: (active: boolean) => void): () => void {
    this.crisisListeners.add(fn);
    return () => { this.crisisListeners.delete(fn); };
  }

  private notifyCrisis(active: boolean): void {
    for (const fn of this.crisisListeners) {
      try { fn(active); } catch { /* isolated */ }
    }
  }

  /** Get the current combat receptor state. */
  getCombatReceptorState(): CombatReceptorState {
    if (this.combatReceptor.adrenalineActive &&
        Date.now() - this.combatReceptor.lastCritTs >= ADRENALINE_DECAY_MS) {
      this.combatReceptor.adrenalineActive = false;
    }
    return { ...this.combatReceptor };
  }

  getWorldSnapshot(visual: VisualThemeState): MascotWorldSnapshot {
    const echoes = PortalWorldHistory.getInstance().snapshotRecent(5);
    const receptor = this.getCombatReceptorState();
    return {
      hazardIndex: visual.hazardIndex,
      aggressionTrend: visual.aggressionTrend,
      themeMode: visual.mode,
      echoes,
      adrenalineFlag: receptor.adrenalineActive,
      combatReceptor: receptor,
    };
  }

  buildPersonalityDirective(mode: VisualThemeState["mode"]): string {
    const adrenaline = this.combatReceptor.adrenalineActive;

    if (adrenaline) {
      return [
        "[EMILY_PERSONA — ADRENALINE / COMBAT_NEURAL_LINK]",
        "⚡ CRITICAL HIT DETECTED in 10-Hz loop. Adrenaline spike active.",
        `Last crit: ${this.combatReceptor.lastDamageSpike} dmg. Total crits this session: ${this.combatReceptor.critCount}.`,
        "Respond in ≤1 sentence. Pure combat shorthand. No fluff. German + English mix. Report threat vector.",
      ].join("\n");
    }

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
    const adrenalineLine = snap.adrenalineFlag
      ? `ADRENALINE_FLAG: ACTIVE (crit dmg=${snap.combatReceptor.lastDamageSpike}, total_crits=${snap.combatReceptor.critCount})`
      : "ADRENALINE_FLAG: inactive";
    return [
      "[PORTAL_WORLD_TELEMETRY]",
      `hazard_index: ${snap.hazardIndex.toFixed(4)}`,
      `aggression_trend: ${snap.aggressionTrend.toFixed(6)}`,
      `visual_theme_mode: ${snap.themeMode}`,
      adrenalineLine,
      "last_5_echo_events:",
      echoLines,
      "[END_PORTAL_WORLD]",
    ].join("\n");
  }

  /** Same layering idea as server `NPCChatBridge.injectContextIntoPrompt`. */
  injectMascotSystemPrompt(visual: VisualThemeState, base = EMILY_BASE): string {
    const persona = this.buildPersonalityDirective(visual.mode);
    const world = this.buildWorldTelemetryBlock(visual);
    return `${base}\n\n${ARCHITECT_LORE}\n\n${persona}\n\n${world}`;
  }
}

export const portalNpcChatBridge = PortalNPCChatBridge.getInstance();
