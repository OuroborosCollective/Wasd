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
  const raw = await page.locator("#e2e-welcome").textContent();
  expect(raw).toBeTruthy();
  const welcome = JSON.parse(raw!) as {
    type?: string;
    stats?: Record<string, unknown>;
    sceneId?: string;
  };
  expect(welcome.type).toBe("welcome");
  expect(welcome.sceneId).toBeTruthy();
  const st = welcome.stats;
  expect(st).toBeTruthy();
  expect(typeof st!.gold).toBe("number");
  expect(typeof st!.level).toBe("number");
  expect(typeof st!.health).toBe("number");
  expect(typeof st!.maxHealth).toBe("number");
  expect(typeof st!.mana).toBe("number");
  expect(typeof st!.maxMana).toBe("number");
  expect(st!.skillCooldownUntil).toBeDefined();
  expect(typeof st!.skillCooldownUntil).toBe("object");
});
