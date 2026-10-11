/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { StitchAssetGalleryPanel, type StitchAssetManifest } from "./StitchAssetGalleryPanel";

describe("StitchAssetGalleryPanel UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
    vi.restoreAllMocks();
  });

  const mockManifest: StitchAssetManifest = {
    version: 1,
    assets: [
      {
        id: "weapon-iron-sword-01",
        kind: "image",
        category: "equipment",
        sourcePath: "weapons/swords/iron-sword.png",
        src: "/assets/iron_sword.png",
      },
      {
        id: "pet-flame-fox-01",
        kind: "image",
        category: "pets",
        sourcePath: "pets/flame-fox.png",
        src: "/assets/flame_fox.png",
      },
      {
        id: "building-stone-tower-01",
        kind: "image",
        category: "building",
        sourcePath: "buildings/stone-tower.png",
        src: "/assets/stone_tower.png",
      },
    ],
    stats: {
      totalFiles: 3,
      importedFiles: 3,
      skippedFiles: 0,
      croppedImages: 1,
      warnings: 0,
    },
  };

  it("renders error state in English when manifest fetch fails", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<StitchAssetGalleryPanel />);
    });

    const missingBanner = container!.querySelector("[data-testid='stitch-asset-gallery-missing']");
    expect(missingBanner).toBeTruthy();
    expect(missingBanner!.textContent).toContain("Manifest not available yet.");
    expect(missingBanner!.textContent).toContain("Merge the Stitch import PR first, then deploy/build.");
  });

  it("renders manifest assets, category icons with aria-hidden, and category buttons with aria-pressed", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockManifest,
    } as Response);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<StitchAssetGalleryPanel />);
    });

    const grid = container!.querySelector("[data-testid='stitch-asset-gallery-grid']");
    expect(grid).toBeTruthy();
    expect(grid!.children.length).toBe(3);

    // Verify category toolbar exists with role="toolbar"
    const toolbar = container!.querySelector("[role='toolbar']");
    expect(toolbar).toBeTruthy();

    // Verify "all" button is active and has aria-pressed="true"
    const allBtn = toolbar!.querySelector("button[aria-label='Filter by all asset categories']");
    expect(allBtn).toBeTruthy();
    expect(allBtn!.getAttribute("aria-pressed")).toBe("true");

    // Verify visual icons are wrapped in aria-hidden="true"
    const hiddenIcon = allBtn!.querySelector("span[aria-hidden='true']");
    expect(hiddenIcon).toBeTruthy();
    expect(hiddenIcon!.textContent).toBe("🎨");

    // Verify weapons category button has aria-pressed="false"
    const weaponsBtn = toolbar!.querySelector("button[aria-label='Filter assets by weapons category']");
    expect(weaponsBtn).toBeTruthy();
    expect(weaponsBtn!.getAttribute("aria-pressed")).toBe("false");
  });

  it("filters assets by category button click and updates aria-pressed", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockManifest,
    } as Response);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<StitchAssetGalleryPanel />);
    });

    const weaponsBtn = container!.querySelector("button[aria-label='Filter assets by weapons category']") as HTMLButtonElement;
    expect(weaponsBtn).toBeTruthy();

    await act(async () => {
      weaponsBtn.click();
    });

    expect(weaponsBtn.getAttribute("aria-pressed")).toBe("true");

    const grid = container!.querySelector("[data-testid='stitch-asset-gallery-grid']");
    expect(grid).toBeTruthy();
    expect(grid!.children.length).toBe(1);
    expect(grid!.textContent).toContain("weapon-iron-sword-01");
  });

  it("filters assets by query input and shows reset button when no results match", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockManifest,
    } as Response);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<StitchAssetGalleryPanel />);
    });

    const searchInput = container!.querySelector("input[aria-label='Search Stitch assets']") as HTMLInputElement;
    expect(searchInput).toBeTruthy();

    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )!.set;
      nativeInputValueSetter!.call(searchInput, "nonexistent_query_string");
      searchInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const noResults = container!.querySelector("[data-testid='stitch-asset-gallery-no-results']");
    expect(noResults).toBeTruthy();
    expect(noResults!.textContent).toContain("No matching assets found");

    const resetBtn = noResults!.querySelector("button") as HTMLButtonElement;
    expect(resetBtn).toBeTruthy();

    await act(async () => {
      resetBtn.click();
    });

    const grid = container!.querySelector("[data-testid='stitch-asset-gallery-grid']");
    expect(grid).toBeTruthy();
    expect(grid!.children.length).toBe(3);
  });
});
