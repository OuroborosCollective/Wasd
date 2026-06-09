/**
 * E2E Blank Screen Smoke Test for 2D Client
 *
 * Tests that /2d/ shows visible UI (not just dark background).
 * If the client crashes or fails to boot, the test fails.
 *
 * This is the primary regression test for the "production blank screen" bug.
 */

import { test, expect } from "@playwright/test";

test.describe("2D Client Boot Smoke Test", () => {
  test("shows visible login/character/world UI, not just background", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Capture page errors (unhandled exceptions)
    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    // Navigate to 2D client
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // Wait for boot to complete (or timeout after 10s)
    await page.waitForTimeout(5_000);

    // Get body text content
    const bodyText = (await page.locator("body").innerText()).trim();

    // Report any errors for debugging (soft assertions)
    expect.soft(
      pageErrors,
      `Page errors detected: ${pageErrors.join("\n")}`
    ).toHaveLength(0);

    expect.soft(
      consoleErrors.filter(e => !e.includes("Warning") && !e.includes("DevTools")),
      `Console errors detected: ${consoleErrors.join("\n")}`
    ).toHaveLength(0);

    // At minimum one of these must exist and be visible:
    // 1. CyberZenLoginGate (login screen)
    // 2. Character select
    // 3. DeterministicWorldIsoApp (world renderer)
    // 4. ArelorianStitchHud (HUD)
    // 5. boot-fatal-overlay (error display)
    // 6. client-2d-boot-diagnostic (BootSurface diagnostic)
    const visibleBootTargets = [
      page.getByTestId("cyber-zen-login-gate"),
      page.getByTestId("character-select"),
      page.getByTestId("deterministic-world-root"),
      page.getByTestId("arelorian-stitch-hud"),
      page.getByTestId("boot-fatal-overlay"),
      page.getByTestId("client-2d-boot-diagnostic"),
      // Fallback: look for the login gate class
      page.locator(".cz-login-root"),
      // Fallback: boot screen should be removed on success
      page.locator("[data-testid='areloria-boot-fallback']"),
      // Fallback: HUD shell class
      page.locator(".stitch-hud"),
      page.locator("#arelorian-stitch-hud"),
    ];

    let visibleCount = 0;
    let visibleTarget = "";

    for (const target of visibleBootTargets) {
      const isVisible = await target.isVisible().catch(() => false);
      if (isVisible) {
        visibleCount++;
        visibleTarget = await target.getAttribute("data-testid").catch(() => "class-based");
        break;
      }
    }

    // The body should have some text content (not just empty background)
    expect(
      bodyText.length,
      `Body text should not be empty. Got: ${bodyText.slice(0, 200)}`
    ).toBeGreaterThan(5);

    // At least one UI element must be visible
    expect(
      visibleCount,
      buildDebugMessage(
        `Expected login/character/world/hud/error overlay to be visible. ` +
        `Body text was: ${bodyText.slice(0, 200)}`,
        { consoleErrors, pageErrors }
      )
    ).toBeGreaterThan(0);

    // Check body data attributes for boot status
    const bootAttr = await page.locator("body").getAttribute("data-areloria-boot");
    const bootOk = await page.locator("body").getAttribute("data-client2d-boot");

    // Either mounted successfully or showing fatal overlay
    expect(
      [bootAttr, bootOk],
      "Boot should be 'mounted' or 'failed', not 'cold' or empty"
    ).toContain("mounted");
  });

  test("boot screen fallback disappears on successful mount", async ({ page }) => {
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // Wait for React to potentially mount
    await page.waitForTimeout(3_000);

    // Check if boot screen is gone (successful mount) or still there (failed)
    const bootScreen = page.locator("#boot-screen, [data-testid='areloria-boot-fallback']");
    const bootVisible = await bootScreen.isVisible().catch(() => false);

    // If boot screen is visible, check if it's showing warning (failed state)
    if (bootVisible) {
      const warning = page.locator("#boot-fallback-warning");
      const warningVisible = await warning.isVisible().catch(() => false);

      // If warning is visible, boot has failed - this is a test failure
      expect(
        warningVisible,
        "Boot fallback warning should not be visible - React should have mounted"
      ).toBe(false);
    }

    // Either way, some UI should be visible
    const hasContent = (await page.locator("body").innerText()).trim().length > 5;
    expect(hasContent, "Page should have visible content").toBe(true);
  });

  test("no critical errors in browser console", async ({ page }) => {
    const criticalErrors: string[] = [];

    page.on("pageerror", (err) => {
      criticalErrors.push(err.message);
    });

    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await page.waitForTimeout(5_000);

    // Filter out non-critical errors
    const realErrors = criticalErrors.filter(
      e => !e.includes("Warning") &&
           !e.includes("DevTools") &&
           !e.includes("favicon")
    );

    expect(
      realErrors,
      `Critical page errors should be empty. Found: ${realErrors.join("\n")}`
    ).toHaveLength(0);
  });

  test("client-2d post-login boot path shows a stable surface", async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(page.locator("body")).toBeVisible();

    // If login button is visible, click it to enter
    const loginButton = page.getByRole("button", { name: /enter|login|play|start/i });
    if (await loginButton.isVisible().catch(() => false)) {
      await loginButton.click();
    }

    // Wait for either world root, boot diagnostic, or HUD to appear
    await expect(
      page.locator(
        [
          "[data-testid='deterministic-world-root']",
          "[data-testid='client-2d-boot-diagnostic']",
          ".stitch-hud",
          "#arelorian-stitch-hud",
          "[data-testid='arelorian-stitch-hud']",
        ].join(",")
      )
    ).toBeVisible({ timeout: 30_000 });

    // HUD shell or diagnostic should be visible
    await expect(
      page.locator(
        [
          "[data-testid='arelorian-stitch-hud']",
          ".stitch-hud",
          "#arelorian-stitch-hud",
          "[data-testid='client-2d-boot-diagnostic']",
        ].join(",")
      )
    ).toBeVisible({ timeout: 30_000 });

    // Page should not have critical errors
    const criticalPageErrors = pageErrors.filter(
      e => !e.includes("Warning") &&
           !e.includes("DevTools") &&
           !e.includes("favicon")
    );
    expect(criticalPageErrors).toEqual([]);
  });
});

function buildDebugMessage(
  message: string,
  ctx: { consoleErrors: string[]; pageErrors: string[] }
): string {
  return `${message}

--- Console Errors ---
${ctx.consoleErrors.slice(0, 20).join("\n") || "none"}

--- Page Errors ---
${ctx.pageErrors.slice(0, 20).join("\n") || "none"}`;
}