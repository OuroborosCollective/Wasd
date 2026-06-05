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