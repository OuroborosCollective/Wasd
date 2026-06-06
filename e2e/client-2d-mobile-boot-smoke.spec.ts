/**
 * E2E Mobile Blank Screen Smoke Test for 2D Client
 *
 * Tests that /2d/ shows visible UI on mobile viewport.
 * This specifically targets the Android/Chrome blank screen issue.
 */

import { test, expect, devices } from "@playwright/test";

// Use Pixel 5 as representative Android device
const pixel5Config = devices["Pixel 5"];

test.describe("2D Client Mobile Boot Smoke Test", () => {
  test.use({
    ...pixel5Config,
  });

  test("mobile /2d/ shows login or boot overlay", async ({ page }) => {
    const pageErrors: string[] = [];

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // Wait for boot
    await page.waitForTimeout(5_000);

    // At least one of: login, character select, world, hud, or fatal overlay
    // must be visible
    await expect(
      page.locator(
        "[data-testid='cyber-zen-login-gate'], " +
        "[data-testid='character-select'], " +
        "[data-testid='deterministic-world-root'], " +
        "[data-testid='arelorian-stitch-hud'], " +
        "[data-testid='boot-fatal-overlay'], " +
        ".cz-login-root"
      ),
      "Mobile should show login, character select, world, HUD, or fatal overlay"
    ).toBeVisible({
      timeout: 15_000,
    });

    // Body should have content
    const bodyText = (await page.locator("body").innerText()).trim();
    expect(bodyText.length, "Body should have visible text content").toBeGreaterThan(5);
  });

  test("mobile viewport shows UI elements, not just background", async ({ page }) => {
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await page.waitForTimeout(5_000);

    // Get all visible text content
    const bodyText = (await page.locator("body").innerText()).trim();

    // Check for presence of meaningful content
    const hasAreloriaContent = bodyText.includes("Areloria") ||
                              bodyText.includes("ARELORIA") ||
                              bodyText.includes("Collective") ||
                              bodyText.includes("Cyber") ||
                              bodyText.includes("PIXI") ||
                              bodyText.includes("10Hz");

    expect(
      hasAreloriaContent,
      `Mobile viewport should show Areloria content, not just dark background. Got: ${bodyText.slice(0, 100)}`
    ).toBe(true);

    // Boot status should be mounted (not cold or empty)
    const bootAttr = await page.locator("body").getAttribute("data-areloria-boot");
    expect(
      bootAttr,
      "Mobile boot should be 'mounted', not 'cold'"
    ).toBe("mounted");
  });

  test("mobile no critical page errors", async ({ page }) => {
    const criticalErrors: string[] = [];

    page.on("pageerror", (err) => {
      criticalErrors.push(err.message);
    });

    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await page.waitForTimeout(5_000);

    // Filter non-critical
    const realErrors = criticalErrors.filter(
      e => !e.includes("Warning") && !e.includes("DevTools")
    );

    expect(
      realErrors,
      `Mobile critical errors should be empty. Found: ${realErrors.join("\n")}`
    ).toHaveLength(0);
  });
});

// Also test iPhone viewport
test.describe("2D Client iPhone Boot Smoke Test", () => {
  test.use({
    ...devices["iPhone 13"],
  });

  test("iphone /2d/ shows login or world UI", async ({ page }) => {
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await page.waitForTimeout(5_000);

    // Check for any visible UI element
    await expect(
      page.locator(
        "[data-testid='cyber-zen-login-gate'], " +
        "[data-testid='character-select'], " +
        "[data-testid='deterministic-world-root'], " +
        ".cz-login-root"
      ),
      "iPhone should show login or world UI"
    ).toBeVisible({
      timeout: 15_000,
    });
  });
});