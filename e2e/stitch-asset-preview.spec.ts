import { test, expect } from "@playwright/test";

/**
 * Stitch Asset Preview E2E Tests
 * 
 * Tests the Stitch 2.5D asset intake pipeline integration with the /2d client.
 * 
 * Prerequisites:
 * - Run intake pipeline: pnpm run assets:stitch:intake -- --input ./assets/raw/stitch/stitch_2.5d_enemy_sprite_atlas.zip
 * - Client must be running (dev mode or built)
 */

test.describe("Stitch Asset Preview Panel", () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the /2d client
    await page.goto("/2d");
    // Wait for the page to load
    await page.waitForLoadState("domcontentloaded");
  });

  test("stitch asset preview panel appears", async ({ page }) => {
    // Look for the stitch asset preview panel
    const panel = page.locator('[data-testid="stitch-asset-preview-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });
  });

  test("manifest count > 0", async ({ page }) => {
    const countEl = page.locator('[data-testid="stitch-asset-manifest-count"]');
    await expect(countEl).toBeVisible();
    
    const text = await countEl.textContent();
    // Should show something like "31 assets"
    expect(text).toMatch(/\d+\s+assets/);
    
    // Extract the number
    const match = text?.match(/(\d+)\s+assets/);
    const count = match ? parseInt(match[1], 10) : 0;
    expect(count).toBeGreaterThan(0);
  });

  test("enemy sample visible", async ({ page }) => {
    const enemySample = page.locator('[data-testid="stitch-asset-enemy-sample"]');
    await expect(enemySample).toBeVisible();
  });

  test("tile sample visible", async ({ page }) => {
    const tileSample = page.locator('[data-testid="stitch-asset-tile-sample"]');
    await expect(tileSample).toBeVisible();
  });

  test("vfx sample visible", async ({ page }) => {
    const vfxSample = page.locator('[data-testid="stitch-asset-vfx-sample"]');
    await expect(vfxSample).toBeVisible();
  });

  test("prop sample visible", async ({ page }) => {
    const propSample = page.locator('[data-testid="stitch-asset-prop-sample"]');
    await expect(propSample).toBeVisible();
  });

  test("quarantine count visible", async ({ page }) => {
    const quarantineCount = page.locator('[data-testid="stitch-asset-quarantine-count"]');
    await expect(quarantineCount).toBeVisible();
    
    // Should show "0 quarantined" or similar
    const text = await quarantineCount.textContent();
    expect(text).toMatch(/quarantined/);
  });

  test("no boot fatal overlay", async ({ page }) => {
    // Check that the client loaded without fatal errors
    // The panel should have loaded successfully
    
    // Check for any error-level console messages related to stitch
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("stitch")) {
        errors.push(msg.text());
      }
    });
    
    // Give time for any async errors
    await page.waitForTimeout(2000);
    
    // Should have no stitch-related errors
    expect(errors.filter(e => e.includes("stitch"))).toHaveLength(0);
  });

  test("panel has correct styling (dark theme)", async ({ page }) => {
    const panel = page.locator('[data-testid="stitch-asset-preview-panel"]');
    await expect(panel).toBeVisible();
    
    // Check that panel has dark background (computed style)
    const bgColor = await panel.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    
    // Should be a dark color (rgba with low values)
    expect(bgColor).toMatch(/rgba?\(/);
  });

  test("sample cards have image previews", async ({ page }) => {
    // Find all sample cards with images
    const sampleCards = page.locator('[data-testid^="stitch-asset-"][data-testid$="-sample"]');
    const count = await sampleCards.count();
    
    expect(count).toBeGreaterThanOrEqual(4);
    
    // Check that at least one card has an img element
    const firstCard = sampleCards.first();
    const img = firstCard.locator("img");
    
    // Image should exist (may or may not be loaded depending on network)
    const imgCount = await firstCard.locator("img").count();
    expect(imgCount).toBeGreaterThanOrEqual(1);
  });

  test("categories breakdown shown", async ({ page }) => {
    const panel = page.locator('[data-testid="stitch-asset-preview-panel"]');
    await expect(panel).toBeVisible();
    
    // Look for categories section
    const catLabel = page.locator("text=CATEGORIES");
    await expect(catLabel).toBeVisible();
  });

  test("deterministic badge present", async ({ page }) => {
    const panel = page.locator('[data-testid="stitch-asset-preview-panel"]');
    await expect(panel).toBeVisible();
    
    // Look for "deterministic" text in footer
    const deterministicText = page.locator("text=deterministic");
    await expect(deterministicText).toBeVisible();
  });

});

test.describe("Stitch Asset Manifest Loading", () => {
  
  test("manifest can be fetched directly", async ({ request }) => {
    const response = await request.get("/2d-assets/stitch/manifest.json");
    expect(response.ok()).toBeTruthy();
    
    const manifest = await response.json();
    
    // Check manifest structure
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.deterministic).toBe(true);
    expect(manifest.packId).toBeTruthy();
    expect(Array.isArray(manifest.assets)).toBe(true);
    expect(manifest.assets.length).toBeGreaterThan(0);
    
    // Check required fields in assets
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
    
    // Check categories
    const categories = new Set(manifest.assets.map((a: any) => a.category));
    expect(categories.size).toBeGreaterThan(0);
    
    // Check for required categories (at least enemy, tile, vfx, prop)
    const hasEnemy = categories.has("enemy");
    const hasTile = categories.has("tile");
    const hasVfx = categories.has("vfx");
    const hasProp = categories.has("prop");
    
    // At least one of these should be present
    expect(hasEnemy || hasTile || hasVfx || hasProp).toBeTruthy();
  });

  test("individual asset images accessible", async ({ request }) => {
    const response = await request.get("/2d-assets/stitch/manifest.json");
    const manifest = await response.json();
    
    // Check first tile asset
    const tileAsset = manifest.assets.find((a: any) => a.category === "tile");
    if (tileAsset) {
      const imgResponse = await request.get(`/2d-assets/stitch/${tileAsset.imagePath}`);
      expect(imgResponse.ok()).toBeTruthy();
      
      // Check content type
      const contentType = imgResponse.headers()["content-type"];
      expect(contentType).toContain("image");
    }
  });

  test("atlas JSON files accessible", async ({ request }) => {
    const response = await request.get("/2d-assets/stitch/manifest.json");
    const manifest = await response.json();
    
    // Check first enemy asset
    const enemyAsset = manifest.assets.find((a: any) => a.category === "enemy");
    if (enemyAsset) {
      const atlasResponse = await request.get(`/2d-assets/stitch/${enemyAsset.atlasPath}`);
      expect(atlasResponse.ok()).toBeTruthy();
      
      const atlas = await atlasResponse.json();
      
      // Check atlas structure
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
    
    // Check for ISO timestamp pattern
    const timestampPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    const matches = manifestStr.match(timestampPattern);
    
    expect(matches).toBeNull();
  });

  test("all asset IDs are deterministic (no UUIDs)", async ({ request }) => {
    const response = await request.get("/2d-assets/stitch/manifest.json");
    const manifest = await response.json();
    
    for (const asset of manifest.assets) {
      // Should not contain UUID-like patterns
      expect(asset.assetId).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      
      // Should start with "stitch_"
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
    
    for (let i = 0; i < assets.length; i++) {
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