/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { GuildStatusPanel } from "./GuildStatusPanel";
import type { LiveGameplaySnapshot } from "../../game/liveGameplaySnapshot";

describe("GuildStatusPanel UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  it("renders waiting state with accessible region and status role", async () => {
    const waitingSnapshot = {
      status: "waiting",
      guild: { id: "", memberCount: 0, villageEligible: false },
    } as LiveGameplaySnapshot;

    await act(async () => {
      const root = createRoot(container!);
      root.render(<GuildStatusPanel snapshot={waitingSnapshot} />);
    });

    const panel = container!.querySelector('[data-testid="guild-panel-waiting"]');
    expect(panel).toBeTruthy();
    expect(panel?.getAttribute("role")).toBe("region");
    expect(panel?.getAttribute("aria-label")).toBe("Guild Status");

    const statusArticle = container!.querySelector('[role="status"]');
    expect(statusArticle).toBeTruthy();
    expect(statusArticle?.getAttribute("aria-live")).toBe("polite");
    expect(container!.textContent).toContain("waiting for server snapshot");
  });

  it("renders unclaimed guild state with accessible region", async () => {
    const emptySnapshot = {
      status: "ok",
      guild: { id: "", memberCount: 0, villageEligible: false },
    } as LiveGameplaySnapshot;

    await act(async () => {
      const root = createRoot(container!);
      root.render(<GuildStatusPanel snapshot={emptySnapshot} />);
    });

    const panel = container!.querySelector('[data-testid="guild-panel-empty"]');
    expect(panel).toBeTruthy();
    expect(panel?.getAttribute("role")).toBe("region");
    expect(panel?.getAttribute("aria-label")).toBe("Guild Status");
    expect(container!.textContent).toContain("unclaimed");
  });

  it("renders live guild state with accessible region", async () => {
    const liveSnapshot = {
      status: "ok",
      guild: {
        id: "g1",
        name: "Arelorian Vanguard",
        memberCount: 12,
        rank: "leader",
        villageEligible: true,
      },
    } as LiveGameplaySnapshot;

    await act(async () => {
      const root = createRoot(container!);
      root.render(<GuildStatusPanel snapshot={liveSnapshot} />);
    });

    const panel = container!.querySelector('[data-testid="guild-panel-live"]');
    expect(panel).toBeTruthy();
    expect(panel?.getAttribute("role")).toBe("region");
    expect(panel?.getAttribute("aria-label")).toBe("Guild Status");
    expect(container!.textContent).toContain("Arelorian Vanguard");
    expect(container!.textContent).toContain("12");
  });
});
