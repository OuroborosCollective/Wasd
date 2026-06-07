import { test, expect } from "@playwright/test";

test.describe("Live System Contract", () => {
  test("2D route boots and client entrypoint health is exposed", async ({ page, request }) => {
    const health = await request.get("/health/client-entrypoints");
    expect(health.ok()).toBeTruthy();

    const body = await health.json();
    expect(body.ok).toBe(true);
    expect(body.clientEntrypoints.source.client2d).toBe("apps/client-2d");
    expect(body.clientEntrypoints.route.client2d).toBe("/2d");
    expect(typeof body.clientEntrypoints.available.client2d).toBe("boolean");

    await page.goto("/2d/?e2e=live-system-contract", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(page.locator("[data-testid='deterministic-world-root']")).toBeVisible({
      timeout: 30_000,
    });
  });
});
