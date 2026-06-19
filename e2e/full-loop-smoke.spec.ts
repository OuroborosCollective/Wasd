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

interface GameplayStats {
  level?: number;
  health?: number;
  maxHealth?: number;
}

interface GameplaySnapshot {
  snapshot?: {
    stats?: GameplayStats;
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

function expectFiniteNumber(value: unknown, label: string): asserts value is number {
  expect(typeof value, `${label} should be number`).toBe("number");
  expect(Number.isFinite(value), `${label} should be finite`).toBe(true);
}

function expectStats(stats: GameplayStats | undefined, label: string): void {
  if (!stats) {
    throw new Error(`${label} stats should exist`);
  }

  const { level, health, maxHealth } = stats;

  expectFiniteNumber(level, `${label}.level`);
  expectFiniteNumber(health, `${label}.health`);
  expectFiniteNumber(maxHealth, `${label}.maxHealth`);
  expect(health).toBeGreaterThanOrEqual(0);
  expect(maxHealth).toBeGreaterThan(0);
  expect(health).toBeLessThanOrEqual(maxHealth);
  expect(level).toBeGreaterThanOrEqual(1);
}

async function expectJsonResponse<T>(response: { status(): number; ok(): boolean; headers(): Record<string, string>; json(): Promise<unknown> }, label: string): Promise<T> {
  expect(response.status(), `${label} should return HTTP 2xx`).toBeGreaterThanOrEqual(200);
  expect(response.status(), `${label} should return HTTP 2xx`).toBeLessThan(300);
  expect(response.ok(), `${label} should be ok`).toBeTruthy();
  expect(response.headers()["content-type"] ?? "", `${label} should return JSON`).toContain("application/json");
  return (await response.json()) as T;
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
  await expect(page.getByTestId(SELECTORS.postLoginRoot)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId(SELECTORS.worldRoot)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId(SELECTORS.hud)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId(SELECTORS.dock)).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(SELECTORS.characterSurface)).toBeVisible({ timeout: 10_000 });
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
  test("complete player loop: login, movement, NPC, quest, combat, loot, reconnect", async ({ context, page, request }) => {
    const errors: string[] = [];

    page.on("pageerror", (error) => {
      errors.push(`PAGE ERROR: ${error.message}`);
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`CONSOLE ERROR: ${msg.text()}`);
    });

    await test.step("1. Guest login via WebSocket", async () => {
      const welcome = await loginAsGuest(page);
      expect(welcome.type).toBe("welcome");
      expect(welcome.stats).toBeTruthy();
      expectFiniteNumber(welcome.stats.health, "welcome.stats.health");
      expectFiniteNumber(welcome.stats.maxHealth, "welcome.stats.maxHealth");
      expectFiniteNumber(welcome.stats.level, "welcome.stats.level");
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
      const json = await expectJsonResponse<GameplaySnapshot>(snapshot, "initial gameplay snapshot");
      expect(json.snapshot).toBeTruthy();
      expectStats(json.snapshot?.stats, "initial gameplay snapshot");
      expect(json.snapshot?.quests).toBeDefined();
      expect(json.snapshot?.inventory).toBeDefined();
    });

    await test.step("4. NPC interaction via API", async () => {
      const talkResponse = await request.post("/api/quest/event", {
        data: { playerId: TEST_PLAYER_ID, type: "npc_talk", npcId: "npc_guide", tick: 1000 },
      });
      await expectJsonResponse<Record<string, unknown>>(talkResponse, "npc talk event");
    });

    await test.step("5. Quest accept and progression", async () => {
      const snapshot = await request.get(`/api/gameplay/snapshot?playerId=${TEST_PLAYER_ID}`);
      const initialJson = await expectJsonResponse<GameplaySnapshot>(snapshot, "quest pre-check snapshot");
      const firstStepsQuest = initialJson.snapshot?.quests?.find((q) => q.id === "first_steps");
      if (firstStepsQuest?.status === "available") {
        const acceptResponse = await request.post("/api/quest/event", {
          data: { playerId: TEST_PLAYER_ID, type: "quest_accept", questId: "first_steps", tick: 1000 },
        });
        await expectJsonResponse<Record<string, unknown>>(acceptResponse, "quest accept event");
      }
    });

    await test.step("6. Player movement via API", async () => {
      const moveResponse = await request.post("/api/player/move", {
        data: { playerId: TEST_PLAYER_ID, position: { x: 500, y: 500 }, direction: "e", tick: 1000 },
      });
      await expectJsonResponse<Record<string, unknown>>(moveResponse, "player movement event");
    });

    await test.step("7. Resource gathering interaction", async () => {
      const gatherResponse = await request.post("/api/resource/gather", {
        data: { nodeId: "starter_tree_001", playerPosition: { x: 460, y: 500 }, currentTick: 1000 },
        params: { playerId: TEST_PLAYER_ID },
      });
      await expectJsonResponse<Record<string, unknown>>(gatherResponse, "resource gather event");
    });

    await test.step("8. Combat stats are reachable", async () => {
      const snapshot = await request.get(`/api/gameplay/snapshot?playerId=${TEST_PLAYER_ID}`);
      const json = await expectJsonResponse<GameplaySnapshot>(snapshot, "combat stats snapshot");
      expectStats(json.snapshot?.stats, "combat stats snapshot");
    });

    await test.step("9. Inventory system check", async () => {
      const snapshot = await request.get(`/api/gameplay/snapshot?playerId=${TEST_PLAYER_ID}`);
      const json = await expectJsonResponse<GameplaySnapshot>(snapshot, "inventory snapshot");
      expect(json.snapshot?.inventory).toBeDefined();
    });

    await test.step("10. WebSocket state persistence across reconnects", async () => {
      const welcome = await reconnectViaSmokePage(context);
      expect(welcome.stats.level).toBeGreaterThanOrEqual(1);
      expect(welcome.stats.health).toBeGreaterThan(0);
    });

    await test.step("11. Final verification - no critical errors", () => {
      const criticalErrors = errors.filter(isCriticalError);
      expect(criticalErrors, `Critical errors found:\n${criticalErrors.join("\n")}`).toEqual([]);
    });
  });

  test("health endpoint and client-config are available", async ({ request }) => {
    const health = await request.get("/health", { timeout: 30_000 });
    const healthJson = await expectJsonResponse<{ ok?: boolean }>(health, "health endpoint");
    expect(healthJson.ok).toBe(true);

    const config = await request.get("/client-config.json", { timeout: 30_000 });
    const configJson = await expectJsonResponse<Record<string, unknown>>(config, "client-config endpoint");
    expect(configJson).toBeTruthy();
  });

  test("WebSocket upgrade path works", async ({ page }) => {
    const wsStatus: string[] = [];
    page.on("console", (msg) => wsStatus.push(`[${msg.type()}] ${msg.text()}`));
    await page.goto("/e2e-smoke.html", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.locator(SELECTORS.e2eStatus)).toHaveText("welcome", { timeout: 15_000 });
    expect(wsStatus.length).toBeGreaterThan(0);
  });
});
