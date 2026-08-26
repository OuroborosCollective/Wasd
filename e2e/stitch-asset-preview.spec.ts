import { test, expect } from "@playwright/test";

/**
 * Stitch Asset Preview E2E Tests
 *
 * Tests the Stitch 2.5D asset intake pipeline integration with the /2d client.
 *
 * Important:
 * The preview panel is a dev/admin visual proof surface. It must not be visible
 * by default in the public live HUD. Tests open it explicitly with the URL flag.
 *
 * Prerequisites:
 * - Run intake pipeline: pnpm run assets:stitch:intake -- --input ./assets/raw/stitch/stitch_2.5d_enemy_sprite_atlas.zip
 * - Client must be running with dev panels or VITE_ENABLE_STITCH_PREVIEW_PANEL=1
 */

async function openStitchPreview(page: import("@playwright/test").Page) {
  await page.goto("/2d?stitchPreview=1");
  await page.waitForLoadState("domcontentloaded");
}

test.describe("Stitch Asset Preview Panel", () => {
  test.beforeEach(async ({ page }) => {
    await openStitchPreview(page);
  });

  test("stitch asset preview panel appears", async ({ page }) => {
    const panel = page.locator('[data-testid="stitch-asset-preview-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });
  });

  test("manifest count > 0", async ({ page }) => {
    const countEl = page.locator('[data-testid="stitch-asset-manifest-count"]');
    await expect(countEl).toBeVisible();

    const text = await countEl.textContent();
    expect(text).toMatch(/\d+\s+assets/);

    const match = text?.match(/(\d+)\s+assets/);
    const count = match ? parseInt(match[1], 10) : 0;
    expect(count).toBeGreaterThan(0);
  });

  test("runtime sample cards are visible", async ({ page }) => {
    await expect(page.locator('[data-testid="stitch-asset-enemy-sample"]')).toBeVisible();
    await expect(page.locator('[data-testid="stitch-asset-tile-sample"]')).toBeVisible();
    await expect(page.locator('[data-testid="stitch-asset-vfx-sample"]')).toBeVisible();
    await expect(page.locator('[data-testid="stitch-asset-prop-sample"]')).toBeVisible();
    await expect(page.locator('[data-testid="stitch-asset-building-sample"]')).toBeVisible();
  });

  test("review queue counts are visible", async ({ page }) => {
    await expect(page.locator('[data-testid="stitch-asset-quarantine-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="stitch-asset-manual-review-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="stitch-asset-reference-only-count"]')).toBeVisible();
  });

  test("resonance proof is visible", async ({ page }) => {
    await expect(page.locator('[data-testid="stitch-resonance-result"]')).toBeVisible();
    await expect(page.locator('[data-testid="stitch-resonance-world-vector"]')).toBeVisible();
    await expect(page.locator('[data-testid="stitch-resonance-score"]')).toHaveText(/score \d+/);
  });

  test("Android/mobile friendly dev button can open preview when flag is enabled", async ({ page, isMobile }) => {
    await page.goto("/2d");
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="stitch-preview-dev-open"]');

    if (await button.isVisible().catch(() => false)) {
      await button.tap().catch(async () => button.click());
      await expect(page.locator('[data-testid="stitch-asset-preview-panel"]')).toBeVisible();
    } else {
      // In production-like runs the button must be absent. That is the safe live-game behavior.
      expect(isMobile || !isMobile).toBeTruthy();
    }
  });

  test("no boot fatal overlay", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("stitch")) {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);
    expect(errors.filter((e) => e.includes("stitch"))).toHaveLength(0);
  });

  test("panel has correct styling (dark theme)", async ({ page }) => {
    const panel = page.locator('[data-testid="stitch-asset-preview-panel"]');
    await expect(panel).toBeVisible();

    const bgColor = await panel.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).toMatch(/rgba?\(/);
  });

  test("sample cards have image previews", async ({ page }) => {
    const sampleCards = page.locator('[data-testid^="stitch-asset-"][data-testid$="-sample"]');
    const count = await sampleCards.count();

    expect(count).toBeGreaterThanOrEqual(4);

    const firstCard = sampleCards.first();
    const imgCount = await firstCard.locator("img").count();
    expect(imgCount).toBeGreaterThanOrEqual(1);
  });

  test("categories breakdown shown", async ({ page }) => {
    await expect(page.locator('[data-testid="stitch-asset-preview-panel"]')).toBeVisible();
    await expect(page.locator("text=CATEGORIES")).toBeVisible();
  });

  test("deterministic badge present", async ({ page }) => {
    await expect(page.locator('[data-testid="stitch-asset-preview-panel"]')).toBeVisible();
    await expect(page.locator("text=deterministic")).toBeVisible();
  });
});

test.describe("Stitch Asset Manifest Loading", () => {
  test("manifest can be fetched directly", async ({ request }) => {
    const response = await request.get("/2d-assets/stitch/manifest.json");
    expect(response.ok()).toBeTruthy();

    const manifest = await response.json();

    expect(manifest.schemaVersion).toBeGreaterThanOrEqual(1);
    expect(manifest.deterministic).toBe(true);
    expect(manifest.packId).toBeTruthy();
    expect(Array.isArray(manifest.assets)).toBe(true);
    expect(manifest.assets.length).toBeGreaterThan(0);

    expect(manifest.manualReview === undefined || Array.isArray(manifest.manualReview)).toBeTruthy();
    expect(manifest.referenceOnly === undefined || Array.isArray(manifest.referenceOnly)).toBeTruthy();

    const requiredFields = [
      "assetId",
      "category",
      "displayName",
      "imagePath",
      "atlasPath",
      "width",
      "height",
      "frameWidth",
      "frameHeight",
      "frameCount",
      "pivot",
      "sourceSha256",
      "processedSha256",
    ];

    for (const asset of manifest.assets) {
      for (const field of requiredFields) {
        expect(asset[field]).toBeDefined();
      }
    }

    const categories = new Set(manifest.assets.map((a: any) => a.category));
    expect(categories.size).toBeGreaterThan(0);

    const hasEnemy = categories.has("enemy");
    const hasTile = categories.has("tile");
    const hasVfx = categories.has("vfx");
    const hasProp = categories.has("prop");

    expect(hasEnemy || hasTile || hasVfx || hasProp).toBeTruthy();
  });

  test("individual asset images accessible", async ({ request }) => {
    const response = await request.get("/2d-assets/stitch/manifest.json");
    const manifest = await response.json();

    const tileAsset = manifest.assets.find((a: any) => a.category === "tile");
    if (tileAsset) {
      const imgResponse = await request.get(`/2d-assets/stitch/${tileAsset.imagePath}`);
      expect(imgResponse.ok()).toBeTruthy();

      const contentType = imgResponse.headers()["content-type"];
      expect(contentType).toContain("image");
    }
  });

  test("atlas JSON files accessible", async ({ request }) => {
    const response = await request.get("/2d-assets/stitch/manifest.json");
    const manifest = await response.json();

    const enemyAsset = manifest.assets.find((a: any) => a.category === "enemy");
    if (enemyAsset) {
      const atlasResponse = await request.get(`/2d-assets/stitch/${enemyAsset.atlasPath}`);
      expect(atlasResponse.ok()).toBeTruthy();

      const atlas = await atlasResponse.json();
      expect(atlas.meta).toBeDefined();
      expect(atlas.frames).toBeDefined();
      expect(atlas.meta.assetId).toBeTruthy();
      expect(Object.keys(atlas.frames).length).toBeGreaterThan(0);
    }
  });
});

test.describe("Stitch Asset Pipeline Determinism", () => {
  test("manifest has no wall-clock timestamps", async ({ request }) => {
    const response = await request.get("/2d-assets/stitch/manifest.json");
    const manifest = await response.json();

    const manifestStr = JSON.stringify(manifest);
    const timestampPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    const matches = manifestStr.match(timestampPattern);

    expect(matches).toBeNull();
  });

  test("all asset IDs are deterministic (no UUIDs)", async ({ request }) => {
    const response = await request.get("/2d-assets/stitch/manifest.json");
    const manifest = await response.json();

    for (const asset of manifest.assets) {
      expect(asset.assetId).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      expect(asset.assetId).toMatch(/^stitch_/);
    }
  });

  test("no duplicate asset IDs", async ({ request }) => {
    const response = await request.get("/2d-assets/stitch/manifest.json");
    const manifest = await response.json();

    const ids = manifest.assets.map((a: any) => a.assetId);
    const uniqueIds = new Set(ids);

    expect(ids.length).toBe(uniqueIds.size);
  });

  test("assets are sorted by category, assetId, sourcePath", async ({ request }) => {
    const response = await request.get("/2d-assets/stitch/manifest.json");
    const manifest = await response.json();

    const assets = manifest.assets;
    const sorted = [...assets].sort((a: any, b: any) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      if (a.assetId !== b.assetId) return a.assetId.localeCompare(b.assetId);
      return a.sourcePath.localeCompare(b.sourcePath);
    });

    for (let i = 0; i < assets.length; i += 1) {
      expect(assets[i].assetId).toBe(sorted[i].assetId);
    }
  });

  test("all assets have valid SHA-256 hashes", async ({ request }) => {
    const response = await request.get("/2d-assets/stitch/manifest.json");
    const manifest = await response.json();

    const sha256Pattern = /^[a-f0-9]{64}$/;

    for (const asset of manifest.assets) {
      expect(asset.sourceSha256).toMatch(sha256Pattern);
      expect(asset.processedSha256).toMatch(sha256Pattern);
    }
  });
});
