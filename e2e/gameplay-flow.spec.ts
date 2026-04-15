import { test, expect } from "@playwright/test";

test("extended gameplay loop over websocket is stable", async ({ page }, testInfo) => {
  test.setTimeout(220_000);
  await page.goto("/e2e-gameplay-flow.html", { waitUntil: "domcontentloaded", timeout: 60_000 });

  await expect(page.locator("body")).toHaveAttribute("data-e2e-ready", "1", { timeout: 210_000 });
  await expect(page.locator("#e2e-gameplay-status")).toHaveText("complete");

  const raw = await page.locator("#e2e-gameplay-result").textContent();
  expect(raw).toBeTruthy();
  const parsed = JSON.parse(raw!) as Record<string, unknown>;

  expect(parsed.questAccepted).toBe(true);
  expect(parsed.questCompleted).toBe(true);
  expect(parsed.skillCastConfirmed).toBe(true);
  expect(parsed.lootDropConfirmed).toBe(true);
  expect(parsed.lootPickupConfirmed).toBe(true);
  expect(parsed.deathConfirmed).toBe(true);
  expect(parsed.respawnConfirmed).toBe(true);

  const isAndroidProfile = testInfo.project.name.includes("android-");
  if (isAndroidProfile) {
    expect(parsed.welcomeDeviceClass).toBeTruthy();
  } else {
    expect(parsed.welcomeDeviceClass).toBe("desktop");
  }
});
