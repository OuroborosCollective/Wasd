import { describe, it, expect, beforeEach } from "vitest";
import { getVisualState } from "@wasd/shared";
import { PortalWorldHistory } from "../world/PortalWorldHistory";
import { PortalNPCChatBridge } from "../world/PortalNPCChatBridge";

describe("Science mascot · stress echo chain + persona", () => {
  beforeEach(() => {
    PortalWorldHistory.resetForTests();
    PortalNPCChatBridge.resetForTests();
  });

  it("10 rapid combat echoes: digest + fire_glitch system persona", () => {
    const hist = PortalWorldHistory.getInstance();
    for (let i = 0; i < 10; i++) {
      const h = Math.min(0.96, 0.74 + i * 0.022);
      hist.recordNpcCombatComplete(`Stress chain #${i + 1}/10 · hazard ${h.toFixed(2)}`);
    }

    const d = hist.getEchoDigestSummary(10);
    expect(d.combat).toBe(10);
    expect(d.trade).toBe(0);
    expect(d.total).toBe(10);

    const visual = getVisualState(0.88, 0.008);
    expect(visual.mode).toBe("fire_glitch");

    const system = PortalNPCChatBridge.getInstance().injectMascotSystemPrompt(visual);
    expect(system).toContain("[EMILY_PERSONA — FIRE_GLITCH]");
    expect(system).toContain("hazard_index:");
    expect(system).toMatch(/Stress chain #10\/10/);
    expect(system).toMatch(/Stress chain #6\/10/);
  });

  it("marina mode uses Cyber-Zen persona block", () => {
    const visual = getVisualState(0.12, 0);
    expect(visual.mode).toBe("marina");
    const system = PortalNPCChatBridge.getInstance().injectMascotSystemPrompt(visual);
    expect(system).toContain("[EMILY_PERSONA — MARINA / CYBER_ZEN]");
  });
});
