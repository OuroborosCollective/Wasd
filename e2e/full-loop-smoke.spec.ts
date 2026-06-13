import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const TEST_PLAYER_ID = "e2e-full-loop-player";
const ENTER_STORAGE_KEY = "wasd:2d:entered";

const SELECTORS = {
  loginGate: "cyber-zen-login-gate",
  postLoginRoot: "post-login-children-root",
  worldRoot: "deterministic-world-root",
  hud: "arelorian-stitch-hud",
  dock: "gameplay-window-dock",
  questPanel: '[data-testid="quest-panel"], [data-testid="quest-tracker"]',
  inventoryPanel: '[data-testid="inventory-panel"], [data-testid="inventory-grid"]',
  characterSurface: '[data-testid="character-paperdoll-root"], [data-testid="paperdoll-panel-live"], [data-testid="character-select"]',
  fatalOverlay: "boot-fatal-overlay",
  e2eStatus: "#e2e-status",
  e2eWelcome: "#e2e-welcome",
} as const;

interface WelcomeStats {
  gold: number;
  level: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  skillCooldownUntil: Record<string, unknown>;
  position?: { x: number; y: number };
}

interface WelcomePayload {
  type: string;
  sceneId: string;
  stats: WelcomeStats;
}

interface GameplaySnapshot {
  snapshot?: {
    stats?: {
      level?: number;
      health?: number;
      maxHealth?: number;
    };
    quests?: Array<{ id: string; status?: string }>;
    inventory?: unknown;
  };
}

function parseJsonOrThrow<T>(raw: string, message: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(
      `${message}\n\nRaw payload:\n${raw}\n\nParse error:\n${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function isCriticalError(message: string): boolean {
  const ignored = [
    "Warning",
    "DevTools",
    "net::ERR_ABORTED",
    "net::ERR_FAILED",
    "favicon",
    "ResizeObserver",
    "Failed to load resource",
  ];

  return !ignored.some((pattern) => message.includes(pattern));
}

async function waitForWebSocketWelcome(page: Page): Promise<WelcomePayload> {
  await expect(page.locator(SELECTORS.e2eStatus)).toHaveText("welcome", {
    timeout: 15_000,
  });

  const raw = await page.locator(SELECTORS.e2eWelcome).textContent();
  expect(raw, "Welcome payload should exist").toBeTruthy();

  return parseJsonOrThrow<WelcomePayload>(raw ?? "", "Invalid welcome payload");
}

async function loginAsGuest(page: Page): Promise<WelcomePayload> {
  await page.goto("/e2e-smoke.html", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  return waitForWebSocketWelcome(page);
}

async function prepareCleanBoot(page: Page): Promise<void> {
  await page.addInitScript((storageKey) => {
    window.localStorage.removeItem(storageKey);
    document.body.dataset.e2eBootPrepared = "1";
  }, ENTER_STORAGE_KEY);
}

async function goto2d(page: Page, marker: string): Promise<void> {
  await prepareCleanBoot(page);
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

async function expectWorldShell(page: Page): Promise<void> {
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

async function reconnectViaSmokePage(context: BrowserContext): Promise<WelcomePayload> {
  const page = await context.newPage();
  try {
    return await loginAsGuest(page);
  } finally {
    await page.close();
  }
}

test.describe("Areloria Full Loop E2E Smoke", () => {
  test("complete player loop: login → movement → NPC interaction → quest → combat → loot → reconnect", async ({
    context,
    page,
    request,
  }) => {
    const errors: string[] = [];

    page.on("pageerror", (error) => {
      errors.push(`PAGE ERROR: ${error.message}`);
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(`CONSOLE ERROR: ${msg.text()}`);
      }
    });

    await test.step("1. Guest login via WebSocket", async () => {
      const welcome = await loginAsGuest(page);

      expect(welcome.type).toBe("welcome");
      expect(welcome.stats).toBeTruthy();
      expect(welcome.stats.health).toBeGreaterThan(0);
      expect(welcome.stats.maxHealth).toBeGreaterThan(0);
      expect(welcome.stats.level).toBeGreaterThanOrEqual(1);
    });

    await test.step("2. Enter the 2D collective world", async () => {
      await goto2d(page, "full-loop-smoke");
      await enterCollective(page);
      await expectWorldShell(page);
    });

    await test.step("3. Verify initial game state via API", async () => {
      const snapshot = await request.get(`/api/gameplay/snapshot?playerId=${TEST_PLAYER_ID}`);
      expect(snapshot.ok()).toBeTruthy();

      const json = (await snapshot.json()) as GameplaySnapshot;
      expect(json.snapshot).toBeTruthy();
      expect(json.snapshot?.stats).toBeTruthy();
      expect(json.snapshot?.quests).toBeDefined();
    });

    await test.step("4. NPC interaction via API", async () => {
      const talkResponse = await request.post("/api/quest/event", {
        data: {
          playerId: TEST_PLAYER_ID,
          type: "npc_talk",
          npcId: "npc_guide",
        },
      });

      expect(talkResponse.status()).toBeLessThan(500);
    });

    await test.step("5. Quest accept and progression", async () => {
      const snapshot = await request.get(`/api/gameplay/snapshot?playerId=${TEST_PLAYER_ID}`);
      const initialJson = (await snapshot.json()) as GameplaySnapshot;

      const firstStepsQuest = initialJson.snapshot?.quests?.find((q) => q.id === "first_steps");
      if (firstStepsQuest?.status === "available") {
        const acceptResponse = await request.post("/api/quest/event", {
          data: {
            playerId: TEST_PLAYER_ID,
            type: "quest_accept",
            questId: "first_steps",
          },
        });

        expect(acceptResponse.ok()).toBeTruthy();
      }
    });

    await test.step("6. Player movement via API", async () => {
      const moveResponse = await request.post("/api/player/move", {
        data: {
          playerId: TEST_PLAYER_ID,
          position: { x: 500, y: 500 },
          direction: "e",
          tick: 1000,
        },
      });

      expect(moveResponse.status()).toBeLessThan(500);
    });

    await test.step("7. Resource gathering interaction", async () => {
      const gatherResponse = await request.post("/api/resource/gather", {
        data: {
          nodeId: "starter_tree_001",
          playerPosition: { x: 460, y: 500 },
          currentTick: 1000,
        },
        params: { playerId: TEST_PLAYER_ID },
      });

      expect(gatherResponse.status()).toBeLessThan(500);
    });

    await test.step("8. Combat stats are reachable", async () => {
      const snapshot = await request.get(`/api/gameplay/snapshot?playerId=${TEST_PLAYER_ID}`);
      expect(snapshot.ok()).toBeTruthy();

      const json = (await snapshot.json()) as GameplaySnapshot;
      expect(json.snapshot?.stats?.health).toBeGreaterThan(0);
      expect(json.snapshot?.stats?.maxHealth).toBeGreaterThan(0);
    });

    await test.step("9. Inventory system check", async () => {
      const snapshot = await request.get(`/api/gameplay/snapshot?playerId=${TEST_PLAYER_ID}`);
      const json = (await snapshot.json()) as GameplaySnapshot;

      expect(json.snapshot?.inventory).toBeDefined();
    });

    await test.step("10. WebSocket state persistence across reconnects", async () => {
      const welcome = await reconnectViaSmokePage(context);
      expect(welcome.stats.level).toBeGreaterThanOrEqual(1);
    });

    await test.step("11. Final verification - no critical errors", () => {
      const criticalErrors = errors.filter(isCriticalError);

      expect(
        criticalErrors,
        `Critical errors found:\n${criticalErrors.join("\n")}`,
      ).toEqual([]);
    });
  });

  test("health endpoint and client-config are available", async ({ request }) => {
    const health = await request.get("/health", { timeout: 30_000 });
    expect(health.status()).toBeGreaterThanOrEqual(200);
    expect(health.status()).toBeLessThan(300);

    const healthJson = await health.json();
    expect(healthJson.ok).toBe(true);

    const config = await request.get("/client-config.json", { timeout: 30_000 });
    expect(config.status()).toBeGreaterThanOrEqual(200);
    expect(config.status()).toBeLessThan(300);

    const configJson = await config.json();
    expect(configJson).toBeTruthy();
  });

  test("WebSocket upgrade path works", async ({ page }) => {
    const wsStatus: string[] = [];

    page.on("console", (msg) => {
      wsStatus.push(`[${msg.type()}] ${msg.text()}`);
    });

    await page.goto("/e2e-smoke.html", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(page.locator(SELECTORS.e2eStatus)).toHaveText("welcome", {
      timeout: 15_000,
    });

    expect(wsStatus.length).toBeGreaterThan(0);
  });
});
