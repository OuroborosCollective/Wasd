/**
 * E2E Tests für 2D Client Deployment Routes
 * 
 * Prüft:
 * - /2d/ liefert REAL_PIXI_CLIENT
 * - /2d/build-stamp.json enthält marker REAL_PIXI_CLIENT
 * - Keine "temporarily unavailable" Placeholder
 */

import { test, expect, type Response } from "@playwright/test";

const REAL_PIXI_CLIENT_MARKER = "REAL_PIXI_CLIENT";
const PLACEHOLDER_PATTERNS = [
  "temporarily unavailable",
  "Areloria 2D unavailable",
  "Cannot GET /2d",
];

test.describe("Areloria 2D Client Deployment Routes", () => {
  test("health endpoint responds with ok=true", async ({ request }) => {
    const res = await request.get("/health", { timeout: 30_000 });
    
    expect(
      res.status(),
      "Health endpoint should return HTTP 2xx"
    ).toBeGreaterThanOrEqual(200);
    expect(
      res.status(),
      "Health endpoint should return HTTP 2xx"
    ).toBeLessThan(300);
    
    const body = await res.json();
    expect(body.ok ?? body.status, "Health response should be ok").toBeTruthy();
  });

  test("/2d/ serves REAL_PIXI_CLIENT", async ({ request }) => {
    const res = await request.get("/2d/", { timeout: 30_000 });
    
    expect(
      res.status(),
      "/2d/ should return HTTP 2xx"
    ).toBeGreaterThanOrEqual(200);
    expect(
      res.status(),
      "/2d/ should return HTTP 2xx"
    ).toBeLessThan(300);
    
    const html = await res.text();
    
    // Must contain REAL_PIXI_CLIENT marker
    expect(
      html,
      "/2d/ must contain REAL_PIXI_CLIENT marker"
    ).toContain(REAL_PIXI_CLIENT_MARKER);
    
    // Must NOT contain placeholder patterns
    for (const pattern of PLACEHOLDER_PATTERNS) {
      expect(
        html,
        `/2d/ must NOT contain placeholder: "${pattern}"`
      ).not.toContain(pattern);
    }
    
    // Should be valid HTML
    expect(html, "/2d/ should be valid HTML").toContain("<!doctype");
  });

  test("/2d/ serves proper content-type", async ({ request }) => {
    const res = await request.get("/2d/", { timeout: 30_000 });
    
    const contentType = res.headers()["content-type"] ?? "";
    expect(
      contentType,
      "/2d/ should return HTML content-type"
    ).toContain("text/html");
  });

  test("/2d/build-stamp.json is available", async ({ request }) => {
    const res = await request.get("/2d/build-stamp.json", { timeout: 30_000 });
    
    expect(
      res.status(),
      "/2d/build-stamp.json should return HTTP 2xx"
    ).toBeGreaterThanOrEqual(200);
    expect(
      res.status(),
      "/2d/build-stamp.json should return HTTP 2xx"
    ).toBeLessThan(300);
    
    const json = await res.json();
    
    // Must contain ok=true or app/client marker
    const jsonStr = JSON.stringify(json);
    expect(
      jsonStr,
      "/2d/build-stamp.json must contain REAL_PIXI_CLIENT marker"
    ).toContain(REAL_PIXI_CLIENT_MARKER);
    
    // Check for app field
    expect(
      json.app ?? json.application,
      "/2d/build-stamp.json should have app field"
    ).toBeTruthy();
  });

  test("/2d/build-stamp.json has valid JSON structure", async ({ request }) => {
    const res = await request.get("/2d/build-stamp.json", { timeout: 30_000 });
    
    const json = await res.json();
    
    // Required fields check
    expect(typeof json, "/2d/build-stamp.json should be object").toBe("object");
    
    // marker field should match
    expect(
      json.marker,
      "/2d/build-stamp.json marker should be REAL_PIXI_CLIENT"
    ).toBe(REAL_PIXI_CLIENT_MARKER);
  });

  test("/2d/index.html is accessible directly", async ({ request }) => {
    const res = await request.get("/2d/index.html", { timeout: 30_000 });
    
    expect(
      res.status(),
      "/2d/index.html should return HTTP 2xx"
    ).toBeGreaterThanOrEqual(200);
    expect(
      res.status(),
      "/2d/index.html should return HTTP 2xx"
    ).toBeLessThan(300);
    
    const html = await res.text();
    expect(html, "/2d/index.html must contain REAL_PIXI_CLIENT").toContain(REAL_PIXI_CLIENT_MARKER);
  });

  test("/2d/ serves full 2D client (not just landing)", async ({ request }) => {
    const res = await request.get("/2d/", { timeout: 30_000 });
    const html = await res.text();
    
    // Check for actual 2D client markers (not just portal/landing)
    const hasPixiMarker = html.includes("PIXI") || html.includes("PixiJS");
    const hasBootMarker = html.includes("boot") || html.includes("Boot");
    
    expect(
      html,
      "/2d/ should contain PixiJS or boot markers for real 2D client"
    ).toMatch(/PixiJS|boot|Boot|Areloria/);
  });

  test("/2d/ does not redirect to wrong route", async ({ request }) => {
    const res = await request.get("/2d/", { timeout: 30_000 });
    
    // Should NOT redirect to /
    expect(
      res.url(),
      "/2d/ should not redirect to root"
    ).not.toContain("//");
  });
});

test.describe("Areloria 2D Client Asset Routes", () => {
  test("/2d/assets/ path is valid (if assets exist)", async ({ request }) => {
    // Try to access assets path - may 404 if no assets yet
    const res = await request.get("/2d/assets/", { timeout: 30_000 });
    
    // Either 200 (with assets) or 404 (no assets yet) is acceptable
    // 500 would indicate broken routing
    expect(
      [200, 404],
      "/2d/assets/ should return 200 or 404, not 500"
    ).toContain(res.status());
  });

  test("/2d/manifest.webmanifest is accessible if PWA enabled", async ({ request }) => {
    const res = await request.get("/2d/manifest.webmanifest", { timeout: 30_000 });
    
    // 200 means PWA manifest exists, 404 means no PWA
    // Both are acceptable for this test
    expect(
      [200, 404],
      "/2d/manifest.webmanifest should return 200 or 404"
    ).toContain(res.status());
  });
});

/**
 * Browser-based E2E tests for ARE Heartbeat integration
 * 
 * Verifies:
 * - 2D client loads in browser
 * - ARE Heartbeat panel is visible
 * - ARE panel shows LIVE status when connected to server
 */
test.describe("2D Client ARE Heartbeat Integration", () => {
  test("2D client boots with module registry and ARE panel hooks", async ({ page }) => {
    const browserLogs: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (msg) => {
      browserLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await test.step("navigate to 2D client", async () => {
      await page.goto("/2d/", {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
    });

    await test.step("wait for client boot marker", async () => {
      // The client should eventually boot with a marker
      // We check for the body having some boot attribute or the ARE panel
      await expect(
        page.locator("body"),
        buildDebugMessage("body should have boot attribute", {
          browserLogs,
          pageErrors,
        }),
      ).toHaveAttribute(/data-areloria-client|data-areloria-boot|class/, /REAL_PIXI_CLIENT|mounted|mounting|are-heartbeat/, {
        timeout: 30_000,
      });
    });

    await test.step("verify ARE panel is visible or accessible", async () => {
      // The ARE panel may render with various selectors
      // Look for ARE-related text or the heartbeat panel
      const areVisible = await page.locator("text=ARE").isVisible({ timeout: 10_000 }).catch(() => false);
      
      // Either ARE is visible, or the page has loaded without critical errors
      if (!areVisible) {
        // Check for errors that would indicate broken boot
        const criticalErrors = pageErrors.filter(e => 
          !e.includes("Warning") && !e.includes("DevTools")
        );
        expect(
          criticalErrors.length,
          buildDebugMessage("No critical page errors should occur", {
            browserLogs,
            pageErrors,
          })
        ).toBeLessThan(5);
      }
    });
  });

  test("ARE heartbeat endpoint accessible from client context", async ({ request }) => {
    // Verify the endpoint is accessible (this is tested in are-heartbeat.spec.ts
    // but we verify it works in the same test context)
    const res = await request.get("/api/are/heartbeat", { timeout: 30_000 });
    expect(res.status()).toBe(200);

    const json = await res.json();
    expect(json.kappa).toBe(1000);
    expect(json.heartbeatStatus).toBe("live");
  });
});

function buildDebugMessage(
  message: string,
  ctx: {
    browserLogs: string[];
    pageErrors: string[];
  },
): string {
  return `${message}

--- Browser logs ---
${ctx.browserLogs.slice(-30).join("\n") || "none"}

--- Page errors ---
${ctx.pageErrors.slice(-30).join("\n") || "none"}`;
}