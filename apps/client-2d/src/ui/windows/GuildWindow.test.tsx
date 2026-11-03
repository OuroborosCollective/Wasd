/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { GuildWindow, guildWindowStore, type GuildSnapshot } from "./GuildWindow";

const mockSnapshot: GuildSnapshot = {
  guildId: "g1",
  guildName: "Ouroboros Knights",
  guildLevel: 10,
  memberCount: 2,
  maxMembers: 50,
  totalContribution: 5000,
  members: [
    { id: "m1", name: "Valerius", level: 60, rank: "leader", online: true, contribution: 3000 },
    { id: "m2", name: "Seraphina", level: 55, rank: "officer", online: false, contribution: 2000 },
  ],
};

describe("GuildWindow UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    act(() => {
      guildWindowStore.receiveSnapshot(mockSnapshot);
    });
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
    vi.restoreAllMocks();
  });

  it("renders guild information correctly with modal ARIA accessibility attributes", async () => {
    await act(async () => {
      const root = createRoot(container!);
      root.render(<GuildWindow isOpen={true} />);
    });

    const overlay = container!.querySelector(".wow-inventory-overlay");
    expect(overlay).toBeTruthy();
    expect(overlay!.getAttribute("role")).toBe("dialog");
    expect(overlay!.getAttribute("aria-modal")).toBe("true");
    expect(overlay!.getAttribute("aria-labelledby")).toBe("guild-window-title");

    const headerTitle = container!.querySelector("#guild-window-title");
    expect(headerTitle).toBeTruthy();
    expect(headerTitle!.textContent).toBe("GUILD");

    const emblem = container!.querySelector(".guild-emblem");
    expect(emblem!.getAttribute("aria-hidden")).toBe("true");

    expect(container!.textContent).toContain("Ouroboros Knights");
    expect(container!.textContent).toContain("Level 10");
    expect(container!.textContent).toContain("5,000");
    expect(container!.textContent).toContain("Valerius");
    expect(container!.textContent).toContain("Seraphina");
  });

  it("calls onClose when close button is clicked and has proper title tooltip", async () => {
    const handleClose = vi.fn();
    await act(async () => {
      const root = createRoot(container!);
      root.render(<GuildWindow isOpen={true} onClose={handleClose} />);
    });

    const closeBtn = container!.querySelector(".wow-close-btn") as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.getAttribute("aria-label")).toBe("Close [ESC]");
    expect(closeBtn.getAttribute("aria-keyshortcuts")).toBe("Escape");
    expect(closeBtn.getAttribute("title")).toBe("Close guild panel [ESC]");

    closeBtn.click();
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", async () => {
    const handleClose = vi.fn();
    await act(async () => {
      const root = createRoot(container!);
      root.render(<GuildWindow isOpen={true} onClose={handleClose} />);
    });

    const event = new KeyboardEvent("keydown", { key: "Escape" });
    window.dispatchEvent(event);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("has descriptive accessibility labels on disabled quick actions", async () => {
    await act(async () => {
      const root = createRoot(container!);
      root.render(<GuildWindow isOpen={true} />);
    });

    const inviteBtn = container!.querySelector('button[aria-label="Invite (Coming Soon)"]') as HTMLButtonElement;
    expect(inviteBtn).toBeTruthy();
    expect(inviteBtn.getAttribute("title")).toBe("Invite (Coming Soon)");
    expect(inviteBtn.disabled).toBe(true);

    const warBtn = container!.querySelector('button[aria-label="War (Coming Soon)"]') as HTMLButtonElement;
    expect(warBtn).toBeTruthy();
    expect(warBtn.getAttribute("title")).toBe("War (Coming Soon)");
    expect(warBtn.disabled).toBe(true);
  });

  it("renders member online status indicators with accessible attributes and tooltips", async () => {
    await act(async () => {
      const root = createRoot(container!);
      root.render(<GuildWindow isOpen={true} />);
    });

    const statusDots = container!.querySelectorAll('.guild-member-status');
    expect(statusDots.length).toBe(2);

    const onlineDot = statusDots[0];
    expect(onlineDot.getAttribute("role")).toBe("status");
    expect(onlineDot.getAttribute("aria-label")).toBe("Online");
    expect(onlineDot.getAttribute("title")).toBe("Online");

    const offlineDot = statusDots[1];
    expect(offlineDot.getAttribute("role")).toBe("status");
    expect(offlineDot.getAttribute("aria-label")).toBe("Offline");
    expect(offlineDot.getAttribute("title")).toBe("Offline");
  });
});
