/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { CharacterSelectPanel } from "./CharacterSelectPanel";

// Mock liveGameplayStore
vi.mock("../../game/liveGameplayStore", () => ({
  fetchGameplaySnapshot: vi.fn().mockResolvedValue({ playerId: "test-player", character: { id: "char-1" } }),
  getDefaultGameplayPlayerId: vi.fn().mockReturnValue("test-player"),
  liveGameplayStore: {
    setSnapshot: vi.fn(),
  },
}));

describe("CharacterSelectPanel UX & Accessibility", () => {
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
    vi.restoreAllMocks();
  });

  it("renders with region landmark and aria-label", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<CharacterSelectPanel />);
    });

    const panel = container!.querySelector('[data-testid="character-select"]');
    expect(panel).toBeTruthy();
    expect(panel!.getAttribute("role")).toBe("region");
    expect(panel!.getAttribute("aria-label")).toBe("Character Creation");
  });

  it("renders creation button with accessible aria-label and matching hover title", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<CharacterSelectPanel />);
    });

    const submitBtn = container!.querySelector(".character-form-button") as HTMLButtonElement;
    expect(submitBtn).toBeTruthy();
    expect(submitBtn.getAttribute("aria-label")).toBe("Create new character");
    expect(submitBtn.getAttribute("title")).toBe("Create new character");
  });

  it("displays validation error with role='status' and aria-live='polite' when name is too short", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<CharacterSelectPanel />);
    });

    const nameInput = container!.querySelector("#char-name-input") as HTMLInputElement;
    const submitBtn = container!.querySelector(".character-form-button") as HTMLButtonElement;

    await act(async () => {
      // Clear name input to fail length validation (< 3 chars)
      nameInput.value = "Ab";
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      // Fire React onChange handler directly
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;
      nativeInputValueSetter?.call(nameInput, "Ab");
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      submitBtn.click();
    });

    const statusEl = container!.querySelector(".character-form-status");
    expect(statusEl).toBeTruthy();
    expect(statusEl!.getAttribute("role")).toBe("status");
    expect(statusEl!.getAttribute("aria-live")).toBe("polite");
    expect(statusEl!.textContent).toContain("Name must be at least 3 characters.");
  });
});
