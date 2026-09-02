/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { VersionOverlay } from "./VersionOverlay";
import type { AreloriaBootConfig } from "../boot/boot.config";
import { CLIENT_VERSION } from "../system/clientVersion";

describe("VersionOverlay UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  it("renders with proper landmark region role, aria-label, and summary title tooltip", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const mockConfig: AreloriaBootConfig = {
      logicHz: 20,
    } as any;

    await act(async () => {
      const root = createRoot(container!);
      root.render(<VersionOverlay config={mockConfig} />);
    });

    const overlay = container!.querySelector("[role='region']");
    expect(overlay).toBeTruthy();
    expect(overlay!.getAttribute("aria-label")).toBe("Client Version and System Info");

    const expectedTitle = `Client ${CLIENT_VERSION.client} - ${CLIENT_VERSION.phase} (20Hz) [${CLIENT_VERSION.buildMode}]`;
    expect(overlay!.getAttribute("title")).toBe(expectedTitle);

    expect(overlay!.textContent).toContain(CLIENT_VERSION.client);
    expect(overlay!.textContent).toContain(CLIENT_VERSION.phase);
    expect(overlay!.textContent).toContain("20Hz");
    expect(overlay!.textContent).toContain(CLIENT_VERSION.buildMode);
  });
});
