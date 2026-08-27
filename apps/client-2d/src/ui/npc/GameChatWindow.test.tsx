/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { GameChatWindow, type ChatState } from "./GameChatWindow";

describe("GameChatWindow UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
    vi.clearAllMocks();
  });

  const defaultState: ChatState = {
    isOpen: true,
    isMinimized: false,
    activeTab: "local",
    unreadCounts: { local: 0, global: 0, trade: 0, guild: 0, faction: 0 },
    messages: [
      {
        id: "msg1",
        channel: "local",
        senderId: "player1",
        senderName: "Alice",
        text: "Hello world!",
        timestamp: 1,
      },
    ],
  };

  it("renders correctly with active channel, input label, and send button attributes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <GameChatWindow
          state={defaultState}
          currentPlayerId="player2"
          currentPlayerName="Bob"
          onSendMessage={() => {}}
          onClose={() => {}}
          onTabChange={() => {}}
          onMinimize={() => {}}
          onMaximize={() => {}}
        />
      );
    });

    // Check TabBar list exists and has correct ARIA role
    const tablist = container!.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();
    expect(tablist?.getAttribute("aria-label")).toBe("Chat channels");

    // Check all channels are rendered as tabs with matching controls and selected state
    const tabs = container!.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(5); // local, global, trade, guild, faction

    const localTab = Array.from(tabs).find(
      (t) => t.textContent?.includes("LOCAL")
    );
    expect(localTab).toBeTruthy();
    expect(localTab?.getAttribute("aria-selected")).toBe("true");
    expect(localTab?.getAttribute("aria-controls")).toBe("chat-panel-local");
    expect(localTab?.getAttribute("aria-label")).toBe("LOCAL channel");

    // Check panel has matching role and id
    const panel = container!.querySelector('[role="tabpanel"]');
    expect(panel).toBeTruthy();
    expect(panel?.getAttribute("id")).toBe("chat-panel-local");
    expect(panel?.getAttribute("aria-label")).toBe("LOCAL chat panel");

    // Check ChatInput has accessibility label
    const input = container!.querySelector('input[type="text"]') || container!.querySelector("input");
    expect(input).toBeTruthy();
    expect(input?.getAttribute("aria-label")).toBe("Message LOCAL channel");

    // Check Send button has label and title
    const sendBtn = container!.querySelector('button[type="submit"]');
    expect(sendBtn).toBeTruthy();
    expect(sendBtn?.getAttribute("aria-label")).toBe("Send message");
    expect(sendBtn?.getAttribute("title")).toBe("Send message");

    // Check Drag Handle has description title
    const dragHandle = container!.querySelector('[title*="Double-click"]');
    expect(dragHandle).toBeTruthy();

    // Check main container has region role and label
    const region = container!.querySelector('[role="region"]');
    expect(region).toBeTruthy();
    expect(region?.getAttribute("aria-label")).toBe("Game Chat Window");

    // Check close button has aria-keyshortcuts="Escape"
    const closeBtn = container!.querySelector('button[aria-label="Close chat window [ESC]"]');
    expect(closeBtn).toBeTruthy();
    expect(closeBtn?.getAttribute("aria-keyshortcuts")).toBe("Escape");
  });

  it("calls onClose when Escape key is pressed", async () => {
    const handleClose = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <GameChatWindow
          state={defaultState}
          currentPlayerId="player2"
          currentPlayerName="Bob"
          onSendMessage={() => {}}
          onClose={handleClose}
          onTabChange={() => {}}
          onMinimize={() => {}}
          onMaximize={() => {}}
        />
      );
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("handles unread messages correctly with singular and plural aria-labels", async () => {
    const stateWithUnreads: ChatState = {
      ...defaultState,
      unreadCounts: { local: 0, global: 1, trade: 3, guild: 0, faction: 0 },
    };

    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <GameChatWindow
          state={stateWithUnreads}
          currentPlayerId="player2"
          currentPlayerName="Bob"
          onSendMessage={() => {}}
          onClose={() => {}}
          onTabChange={() => {}}
          onMinimize={() => {}}
          onMaximize={() => {}}
        />
      );
    });

    const tabs = container!.querySelectorAll('[role="tab"]');

    // Global tab (1 unread message - singular)
    const globalTab = Array.from(tabs).find(
      (t) => t.textContent?.includes("GLOBAL")
    );
    expect(globalTab).toBeTruthy();
    expect(globalTab?.getAttribute("aria-label")).toBe("GLOBAL channel, 1 unread message");
    expect(globalTab?.getAttribute("title")).toBe("1 unread message");

    // Trade tab (3 unread messages - plural)
    const tradeTab = Array.from(tabs).find(
      (t) => t.textContent?.includes("TRADE")
    );
    expect(tradeTab).toBeTruthy();
    expect(tradeTab?.getAttribute("aria-label")).toBe("TRADE channel, 3 unread messages");
    expect(tradeTab?.getAttribute("title")).toBe("3 unread messages");

    // Check that visual unread dot is hidden from screen readers
    const dots = container!.querySelectorAll('span[style*="background-color: rgb(80, 200, 120)"]');
    expect(dots.length).toBe(2);
    expect(dots[0].getAttribute("aria-hidden")).toBe("true");
    expect(dots[1].getAttribute("aria-hidden")).toBe("true");
  });

  it("handles empty messages panel accessibility", async () => {
    const emptyState: ChatState = {
      ...defaultState,
      messages: [],
    };

    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <GameChatWindow
          state={emptyState}
          currentPlayerId="player2"
          currentPlayerName="Bob"
          onSendMessage={() => {}}
          onClose={() => {}}
          onTabChange={() => {}}
          onMinimize={() => {}}
          onMaximize={() => {}}
        />
      );
    });

    const panel = container!.querySelector('[role="tabpanel"]');
    expect(panel).toBeTruthy();
    expect(panel?.textContent).toContain("No messages in LOCAL chat");
  });
});
