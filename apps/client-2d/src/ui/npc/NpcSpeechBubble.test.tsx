/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { NpcSpeechBubble } from "./NpcSpeechBubble";

describe("NpcSpeechBubble UX & Accessibility", () => {
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

  it("returns null when isVisible is false", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <NpcSpeechBubble
          npcName="Eldrin"
          text="Greetings traveler!"
          isVisible={false}
        />
      );
    });

    expect(container!.children.length).toBe(0);
    expect(container!.textContent).toBe("");
  });

  it("renders with live status role, aria-label, and proper accessibility attributes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <NpcSpeechBubble
          npcName="Eldrin"
          text="Greetings traveler!"
          variant="speaking"
          emotion="happy"
        />
      );
    });

    const bubble = container!.querySelector("[role='status']");
    expect(bubble).toBeTruthy();
    expect(bubble?.getAttribute("aria-live")).toBe("polite");
    expect(bubble?.getAttribute("aria-label")).toBe("Eldrin is speaking");

    expect(bubble?.textContent).toContain("Eldrin");
    expect(bubble?.textContent).toContain("“Greetings traveler!”");

    // Decorative emotion and variant indicators must have aria-hidden="true"
    const hiddenSpans = bubble?.querySelectorAll("span[aria-hidden='true']");
    expect(hiddenSpans?.length).toBeGreaterThanOrEqual(2);

    const emotionWrapper = bubble?.querySelector("[title='Emotion: happy']");
    expect(emotionWrapper).toBeTruthy();
    expect(emotionWrapper?.querySelector("span[aria-hidden='true']")?.textContent).toBe("◉");

    const variantIcon = Array.from(hiddenSpans ?? []).find(
      (el) => el.textContent === "💬"
    );
    expect(variantIcon).toBeTruthy();
  });

  it("renders dismiss button with accessible title and aria-label, and fires onDismiss when clicked", async () => {
    const onDismissMock = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <NpcSpeechBubble
          npcName="Lyra"
          text="I sense dark forces nearby..."
          variant="thinking"
          emotion="confused"
          onDismiss={onDismissMock}
        />
      );
    });

    const bubble = container!.querySelector("[role='status']");
    expect(bubble?.getAttribute("aria-label")).toBe("Lyra is thinking");

    const dismissBtn = container!.querySelector("button[aria-label='Dismiss speech bubble']") as HTMLButtonElement;
    expect(dismissBtn).toBeTruthy();
    expect(dismissBtn.getAttribute("title")).toBe("Dismiss speech bubble");

    const closeIcon = dismissBtn.querySelector("span[aria-hidden='true']");
    expect(closeIcon?.textContent).toBe("✕");

    await act(async () => {
      dismissBtn.click();
    });

    expect(onDismissMock).toHaveBeenCalledTimes(1);
  });

  it("truncates long text and displays character count indicator", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const longText = "The ancient forest whispers secrets of a lost empire that once spanned across all of Areloria before the great cataclysm.";

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <NpcSpeechBubble
          npcName="Elder Vael"
          text={longText}
          maxLength={40}
        />
      );
    });

    const bubble = container!.querySelector("[role='status']");
    expect(bubble).toBeTruthy();

    // Check truncated text
    expect(bubble?.textContent).toContain("The ancient forest whispers secrets o...");

    // Check character count indicator
    expect(bubble?.textContent).toContain(`${longText.length}/40`);
  });
});
