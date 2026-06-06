/**
 * E2E Tests for Real Post-Login World and HUD Boot Path
 *
 * Verifies:
 * - Login Gate visible before click
 * - After click: deterministic-world-root visible
 * - arelorian-stitch-hud visible
 * - gameplay-window-dock visible
 * - character-select or paperdoll-panel-live visible
 * - No boot-fatal-overlay in normal flow
 */

import { test, expect, devices, type Page } from "@playwright/test";

const ENTER_STORAGE_KEY = "wasd:2d:entered";

const SELECTORS = {
  loginGate: "cyber-zen-login-gate",
  postLoginRoot: "post-login-children-root",
  worldRoot: "deterministic-world-root",
  hud: "arelorian-stitch-hud",
  dock: "gameplay-window-dock",
  fatalOverlay: "boot-fatal-overlay",
  bootStatus: "world-boot-status",
  characterSurface:
    '[data-testid="character-paperdoll-root"], [data-testid="character-select"], [data-testid="paperdoll-panel-live"]',
} as const;

function isCriticalError(message: string): boolean {
  const ignored = [
    "Warning",
    "DevTools",
    "net::ERR_ABORTED",
    "net::ERR_FAILED",
    "favicon",
    "ResizeObserver loop",
    "Failed to load resource",
  ];

  return !ignored.some((entry) => message.includes(entry));
}

async function prepareCleanBoot(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  await page.addInitScript((storageKey) => {
    window.localStorage.removeItem(storageKey);
    document.body.dataset.e2eBootPrepared = "1";
  }, ENTER_STORAGE_KEY);

  return errors;
}

async function goto2d(page: Page, marker: string): Promise<void> {
  await page.goto(`/2d/?e2e=${marker}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
}

async function enterCollective(page: Page): Promise<void> {
  await expect(page.getByTestId(SELECTORS.loginGate)).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole("button", { name: /collective betreten/i }).click();

  await page.waitForFunction(() => {
    return document.body.dataset.postLoginShell === "entered-rendering-children";
  }, null, {
    timeout: 10_000,
  });
}

async function expectNormalWorldShell(page: Page): Promise<void> {
  await expect(page.getByTestId(SELECTORS.postLoginRoot)).toBeVisible({
    timeout: 10_000,
  });

  await expect(page.getByTestId(SELECTORS.worldRoot)).toBeVisible({
    timeout: 10_000,
  });

  await expect(page.getByTestId(SELECTORS.hud)).toBeVisible({
    timeout: 10_000,
  });

  await expect(page.getByTestId(SELECTORS.dock)).toBeVisible({
    timeout: 10_000,
  });

  await expect(page.locator(SELECTORS.characterSurface)).toBeVisible({
    timeout: 10_000,
  });

  await expect(page.getByTestId(SELECTORS.fatalOverlay)).toHaveCount(0);
}

test.describe("Real Post-Login World Boot Path", () => {
  test("real post-login flow shows world root, hud, dock and character surface", async ({ page }) => {
    const errors = await prepareCleanBoot(page);

    await goto2d(page, "real-post-login");
    await enterCollective(page);
    await expectNormalWorldShell(page);

    const criticalErrors = errors.filter(isCriticalError);

    expect(
      criticalErrors,
      `Critical errors:\n${criticalErrors.join("\n")}`,
    ).toEqual([]);
  });

  test("world boot status shows during initialization", async ({ page }) => {
    await prepareCleanBoot(page);

    await goto2d(page, "boot-status");
    await enterCollective(page);

    const bootStatus = page.getByTestId(SELECTORS.bootStatus);

    await expect(bootStatus).toBeVisible({
      timeout: 10_000,
    });

    await expect(bootStatus).toContainText(/Areloria World/i, {
      timeout: 60_000,
    });

    await expect(page.getByTestId(SELECTORS.fatalOverlay)).toHaveCount(0);
  });

  test("post-login shell markers are set correctly", async ({ page }) => {
    await prepareCleanBoot(page);

    await goto2d(page, "post-login-markers");

    await expect
      .poll(async () => {
        return page.evaluate(() => document.body.dataset.postLoginShell);
      }, {
        timeout: 10_000,
      })
      .toBe("waiting-for-entry");

    await page.getByRole("button", { name: /collective betreten/i }).click();

    await expect
      .poll(async () => {
        return page.evaluate(() => document.body.dataset.postLoginShell);
      }, {
        timeout: 10_000,
      })
      .toBe("entered-rendering-children");

    await expect(page.getByTestId(SELECTORS.fatalOverlay)).toHaveCount(0);
  });
});

test.describe("Mobile Real Post-Login Flow", () => {
  test.use({ ...devices["Pixel 5"] });

  test("mobile real post-login flow shows dock and character surface", async ({ page }) => {
    const errors = await prepareCleanBoot(page);

    await goto2d(page, "real-mobile-post-login");
    await enterCollective(page);

    await expect(page.getByTestId(SELECTORS.worldRoot)).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByTestId(SELECTORS.hud)).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByTestId(SELECTORS.dock)).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.locator(SELECTORS.characterSurface)).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByTestId(SELECTORS.fatalOverlay)).toHaveCount(0);

    const criticalErrors = errors.filter(isCriticalError);

    expect(
      criticalErrors,
      `Critical mobile errors:\n${criticalErrors.join("\n")}`,
    ).toEqual([]);
  });
});
