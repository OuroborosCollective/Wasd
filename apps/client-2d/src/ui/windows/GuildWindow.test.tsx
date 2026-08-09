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

  it("renders guild information correctly", async () => {
    await act(async () => {
      const root = createRoot(container!);
      root.render(<GuildWindow isOpen={true} />);
    });

    expect(container!.textContent).toContain("GUILD");
    expect(container!.textContent).toContain("Ouroboros Knights");
    expect(container!.textContent).toContain("Level 10");
    expect(container!.textContent).toContain("5,000");
    expect(container!.textContent).toContain("Valerius");
    expect(container!.textContent).toContain("Seraphina");
  });

  it("calls onClose when close button is clicked", async () => {
    const handleClose = vi.fn();
    await act(async () => {
      const root = createRoot(container!);
      root.render(<GuildWindow isOpen={true} onClose={handleClose} />);
    });

    const closeBtn = container!.querySelector(".wow-close-btn") as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.getAttribute("aria-label")).toBe("Close [ESC]");
    expect(closeBtn.getAttribute("aria-keyshortcuts")).toBe("Escape");

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
});
