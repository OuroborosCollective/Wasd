import { test, expect } from "@playwright/test";

type WelcomeStats = {
  gold: number;
  level: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  skillCooldownUntil: Record<string, unknown>;
};

type WelcomePayload = {
  type: string;
  sceneId: string;
  stats: WelcomeStats;
};

test.describe("Areloria E2E Smoke", () => {
  test("health endpoint responds with ok=true", async ({ request }) => {
    const res = await request.get("/health", {
      timeout: 30_000,
    });

    expect(res.status(), "Health endpoint should return HTTP 2xx").toBeGreaterThanOrEqual(200);
    expect(res.status(), "Health endpoint should return HTTP 2xx").toBeLessThan(300);
    expect(res.ok(), "Health endpoint response should be ok").toBeTruthy();

    const contentType = res.headers()["content-type"] ?? "";
    expect(
      contentType,
      "Health endpoint should return JSON content-type",
    ).toContain("application/json");

    const body = await res.json();

    expect(body, "Health response body should exist").toBeTruthy();
    expect(body.ok, "Health response should contain ok=true").toBe(true);
  });

  test("e2e-smoke page completes guest login over WebSocket", async ({ page }) => {
    const browserLogs: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (msg) => {
      browserLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    page.on("requestfailed", (request) => {
      failedRequests.push(
        `${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? "unknown error"}`,
      );
    });

    await test.step("open smoke page", async () => {
      await page.goto("/e2e-smoke.html", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
    });

    await test.step("wait for e2e-ready marker", async () => {
      await expect(
        page.locator("body"),
        buildDebugMessage("body[data-e2e-ready=1] was not reached", {
          browserLogs,
          pageErrors,
          failedRequests,
        }),
      ).toHaveAttribute("data-e2e-ready", "1", {
        timeout: 30_000,
      });
    });

    await test.step("verify websocket status", async () => {
      await expect(
        page.locator("#e2e-status"),
        buildDebugMessage("#e2e-status should become welcome", {
          browserLogs,
          pageErrors,
          failedRequests,
        }),
      ).toHaveText("welcome", {
        timeout: 10_000,
      });
    });

    let welcome: WelcomePayload;

    await test.step("parse welcome payload", async () => {
      const raw = await page.locator("#e2e-welcome").textContent();

      expect(
        raw,
        buildDebugMessage("Missing welcome payload in #e2e-welcome", {
          browserLogs,
          pageErrors,
          failedRequests,
        }),
      ).toBeTruthy();

      welcome = parseJsonOrThrow<WelcomePayload>(
        raw ?? "",
        "#e2e-welcome did not contain valid JSON",
      );
    });

    await test.step("validate welcome payload shape", async () => {
      expect(welcome.type, "welcome.type should be welcome").toBe("welcome");

      expect(welcome.sceneId, "welcome.sceneId should exist").toBeTruthy();
      expect(typeof welcome.sceneId, "welcome.sceneId should be string").toBe("string");

      expect(welcome.stats, "welcome.stats should exist").toBeTruthy();

      const st = welcome.stats;

      expectFiniteNumber(st.gold, "stats.gold");
      expectFiniteNumber(st.level, "stats.level");
      expectFiniteNumber(st.health, "stats.health");
      expectFiniteNumber(st.maxHealth, "stats.maxHealth");
      expectFiniteNumber(st.mana, "stats.mana");
      expectFiniteNumber(st.maxMana, "stats.maxMana");

      expect(st.health, "health should not be negative").toBeGreaterThanOrEqual(0);
      expect(st.maxHealth, "maxHealth should be positive").toBeGreaterThan(0);
      expect(st.health, "health should not exceed maxHealth").toBeLessThanOrEqual(st.maxHealth);

      expect(st.mana, "mana should not be negative").toBeGreaterThanOrEqual(0);
      expect(st.maxMana, "maxMana should be positive").toBeGreaterThan(0);
      expect(st.mana, "mana should not exceed maxMana").toBeLessThanOrEqual(st.maxMana);

      expect(st.level, "level should be at least 1").toBeGreaterThanOrEqual(1);
      expect(st.gold, "gold should not be negative").toBeGreaterThanOrEqual(0);

      expect(st.skillCooldownUntil, "stats.skillCooldownUntil should be defined").toBeDefined();
      expect(
        typeof st.skillCooldownUntil,
        "stats.skillCooldownUntil should be an object",
      ).toBe("object");
      expect(
        Array.isArray(st.skillCooldownUntil),
        "stats.skillCooldownUntil should not be an array",
      ).toBe(false);
    });
  });
});

function parseJsonOrThrow<T>(raw: string, message: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(
      `${message}

Raw payload:
${raw}

Parse error:
${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function expectFiniteNumber(value: unknown, fieldName: string): void {
  expect(typeof value, `${fieldName} should be number`).toBe("number");
  expect(Number.isFinite(value), `${fieldName} should be finite`).toBe(true);
}

function buildDebugMessage(
  message: string,
  ctx: {
    browserLogs: string[];
    pageErrors: string[];
    failedRequests: string[];
  },
): string {
  return `${message}

--- Browser logs ---
${ctx.browserLogs.slice(-30).join("\n") || "none"}

--- Page errors ---
${ctx.pageErrors.slice(-30).join("\n") || "none"}

--- Failed requests ---
${ctx.failedRequests.slice(-30).join("\n") || "none"}`;
}
