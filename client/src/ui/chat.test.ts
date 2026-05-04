/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import * as chatModule from "./chat";

describe("Chat UI Accessibility", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    chatModule.resetChatInitialized();
  });

  it("creates chat container with correct accessibility attributes", () => {
    const mockSender = () => {};
    chatModule.initChat(mockSender);

    const container = document.getElementById("chat-container");
    expect(container).toBeTruthy();

    const tabBar = document.getElementById("chat-tab-bar");
    expect(tabBar?.getAttribute("role")).toBe("tablist");
    expect(tabBar?.getAttribute("aria-label")).toBe("Chat Channels");

    const tabs = tabBar?.querySelectorAll('button[role="tab"]');
    expect(tabs?.length).toBe(4);
    expect(tabs?.[0].getAttribute("aria-selected")).toBe("true"); // 'all' is active by default

    const minimizeBtn = document.getElementById("chat-minimize-btn");
    expect(minimizeBtn?.getAttribute("aria-expanded")).toBe("true");
    expect(minimizeBtn?.getAttribute("aria-controls")).toBe("chat-body");
    expect(minimizeBtn?.getAttribute("aria-label")).toBe("Minimize chat");

    const chatBody = document.getElementById("chat-body");
    expect(chatBody?.getAttribute("role")).toBe("tabpanel");
    expect(chatBody?.getAttribute("aria-labelledby")).toBe("chat-tab-bar");
  });

  it("updates accessibility attributes when toggling minimize", () => {
    const mockSender = () => {};
    chatModule.initChat(mockSender);

    const minimizeBtn = document.getElementById("chat-minimize-btn") as HTMLButtonElement;
    const chatBody = document.getElementById("chat-body");

    expect(minimizeBtn).toBeTruthy();

    // Toggle to minimized
    minimizeBtn.click();
    expect(chatBody?.style.display).toBe("none");
    expect(minimizeBtn.getAttribute("aria-expanded")).toBe("false");
    expect(minimizeBtn.getAttribute("aria-label")).toBe("Maximize chat");

    // Toggle back to expanded
    minimizeBtn.click();
    expect(chatBody?.style.display).toBe("block");
    expect(minimizeBtn.getAttribute("aria-expanded")).toBe("true");
    expect(minimizeBtn.getAttribute("aria-label")).toBe("Minimize chat");
  });
});
