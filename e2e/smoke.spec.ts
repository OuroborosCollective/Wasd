import { test, expect } from "@playwright/test";

test("health endpoint responds", async ({ request }) => {
  const res = await request.get("/health");
  expect(res.ok()).toBeTruthy();
  const j = await res.json();
  expect(j.ok).toBe(true);
});

test("e2e-smoke page completes guest login over WebSocket", async ({ page }) => {
  await page.goto("/e2e-smoke.html", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.locator("body")).toHaveAttribute("data-e2e-ready", "1", { timeout: 30_000 });
  await expect(page.locator("#e2e-status")).toHaveText("welcome");
});
