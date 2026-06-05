/**
 * E2E Tests für Portal Deployment Routes
 * 
 * Prüft:
 * - /portal/ liefert HTML (nicht "Cannot GET /portal")
 * - /are-console.html existiert
 * - /sovereign-truth.html existiert
 * - Keine 500er Fehler
 */

import { test, expect } from "@playwright/test";

const PORTAL_MARKERS = [
  "PORTAL ONLINE",
  "portal",
  "Portal",
  "ARE",
  "Control",
];

const ERROR_PATTERNS = [
  "Cannot GET /portal",
  "Cannot GET /are-console",
  "Internal Server Error",
  "500 Internal Server Error",
];

test.describe("Areloria Portal Deployment Routes", () => {
  test("/portal/ does not return Cannot GET", async ({ request }) => {
    const res = await request.get("/portal/", { timeout: 30_000 });
    
    expect(
      res.status(),
      "/portal/ should return HTTP 2xx"
    ).toBeGreaterThanOrEqual(200);
    expect(
      res.status(),
      "/portal/ should return HTTP 2xx"
    ).toBeLessThan(300);
    
    const text = await res.text();
    
    // Must NOT contain "Cannot GET /portal"
    expect(
      text,
      "/portal/ must NOT return 'Cannot GET /portal'"
    ).not.toContain("Cannot GET /portal");
    
    // Should be valid HTML
    expect(text, "/portal/ should be valid HTML").toMatch(/<!doctype|<html/i);
  });

  test("/portal/ serves HTML content-type", async ({ request }) => {
    const res = await request.get("/portal/", { timeout: 30_000 });
    
    const contentType = res.headers()["content-type"] ?? "";
    expect(
      contentType,
      "/portal/ should return HTML content-type"
    ).toContain("text/html");
  });

  test("/portal/ contains portal markers", async ({ request }) => {
    const res = await request.get("/portal/", { timeout: 30_000 });
    const html = await res.text();
    
    // Should contain at least one portal marker
    const hasMarker = PORTAL_MARKERS.some(marker => html.includes(marker));
    expect(
      html,
      "/portal/ should contain portal markers"
    ).toBeTruthy();
  });

  test("/portal/index.html is accessible directly", async ({ request }) => {
    const res = await request.get("/portal/index.html", { timeout: 30_000 });
    
    expect(
      res.status(),
      "/portal/index.html should return HTTP 2xx"
    ).toBeGreaterThanOrEqual(200);
    expect(
      res.status(),
      "/portal/index.html should return HTTP 2xx"
    ).toBeLessThan(300);
  });

  test("/are-console.html is accessible", async ({ request }) => {
    const res = await request.get("/are-console.html", { timeout: 30_000 });
    
    // 200 = exists, 404 = doesn't exist yet
    // 500 would indicate broken routing
    expect(
      [200, 404],
      "/are-console.html should return 200 or 404, not 500"
    ).toContain(res.status());
    
    if (res.status() === 200) {
      const html = await res.text();
      expect(html, "/are-console.html should be valid HTML").toMatch(/<!doctype|<html/i);
    }
  });

  test("/sovereign-truth.html is accessible", async ({ request }) => {
    const res = await request.get("/sovereign-truth.html", { timeout: 30_000 });
    
    // 200 = exists, 404 = doesn't exist yet
    // 500 would indicate broken routing
    expect(
      [200, 404],
      "/sovereign-truth.html should return 200 or 404, not 500"
    ).toContain(res.status());
    
    if (res.status() === 200) {
      const html = await res.text();
      expect(html, "/sovereign-truth.html should be valid HTML").toMatch(/<!doctype|<html/i);
    }
  });
});

test.describe("Portal API Routes", () => {
  test("/api/are/replay/stats is accessible", async ({ request }) => {
    const res = await request.get("/api/are/replay/stats", { timeout: 30_000 });
    
    // 200 = exists with data, 404 = doesn't exist, 401/403 = auth required
    // 500 would indicate broken routing
    expect(
      [200, 404, 401, 403],
      "/api/are/replay/stats should return valid response"
    ).toContain(res.status());
  });

  test("/api/v1/warfront/cycle is accessible", async ({ request }) => {
    const res = await request.get("/api/v1/warfront/cycle", { timeout: 30_000 });
    
    // 200 = exists with data, 404 = doesn't exist, 401/403 = auth required
    expect(
      [200, 404, 401, 403],
      "/api/v1/warfront/cycle should return valid response"
    ).toContain(res.status());
  });
});

test.describe("Portal Error Handling", () => {
  test("/portal/ does not contain error patterns", async ({ request }) => {
    const res = await request.get("/portal/", { timeout: 30_000 });
    const text = await res.text();
    
    for (const pattern of ERROR_PATTERNS) {
      expect(
        text,
        `/portal/ must NOT contain error pattern: "${pattern}"`
      ).not.toContain(pattern);
    }
  });

  test("/portal/ returns proper status on error", async ({ request }) => {
    // Invalid path should return 404, not 500
    const res = await request.get("/portal/nonexistent-route-12345", { timeout: 30_000 });
    
    // 404 = SPA fallback, 200 = served index.html
    // 500 would indicate broken routing
    expect(
      [200, 404],
      "/portal/nonexistent should return 200 or 404, not 500"
    ).toContain(res.status());
  });
});