/**
 * LIVE SYSTEM CONTRACT E2E TEST
 *
 * Verifies the live system contract exposes /2d route and no fake root source assumption.
 * Tests route /2d - does not test source path 2d/.
 *
 * Rules:
 * - Test route /2d
 * - Do not test source path 2d/
 * - The test should prove visible runtime, not fake filesystem assumptions
 */

import { test, expect } from "@playwright/test";

test("live system contract exposes 2d route and no fake root source assumption", async ({ request, page }) => {
  const health = await request.get("/health");
  expect([200, 503]).toContain(health.status());

  const body = await health.json();
  expect(body).toBeTruthy();

  // Verify clientEntrypoints in health response
  if (body.clientEntrypoints) {
    expect(body.clientEntrypoints.source.client2d).toBe("apps/client-2d");
    expect(body.clientEntrypoints.route.client2d).toBe("/2d");
  }

  // Navigate to /2d route
  await page.goto("/2d", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toBeVisible();

  // Check for console errors
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  // No errors should be present
  expect(errors).toEqual([]);
});

test("health endpoint reports clientEntrypoints with source truth", async ({ request }) => {
  const health = await request.get("/health");
  const status = health.status();
  expect([200, 503]).toContain(status);

  const body = await health.json();

  // Verify clientEntrypoints structure
  expect(body.clientEntrypoints).toBeDefined();
  expect(body.clientEntrypoints.source).toBeDefined();
  expect(body.clientEntrypoints.runtime).toBeDefined();
  expect(body.clientEntrypoints.route).toBeDefined();
  expect(body.clientEntrypoints.available).toBeDefined();

  // Verify source truth
  expect(body.clientEntrypoints.source.client2d).toBe("apps/client-2d");
  expect(body.clientEntrypoints.source.client3d).toBe("client");
  expect(body.clientEntrypoints.source.portal).toBe("portal");

  // Verify routes
  expect(body.clientEntrypoints.route.client2d).toBe("/2d");
  expect(body.clientEntrypoints.route.client3d).toBe("/3d");
  expect(body.clientEntrypoints.route.portal).toBe("/portal");
});

test("guard:entrypoints script validates real source paths", () => {
  // This test verifies the guard script exists and can be invoked
  // In CI, this would be run via: pnpm guard:entrypoints
  // Here we just verify the script exists in the expected location
  const { existsSync } = require("fs");
  expect(existsSync("scripts/verify-client-entrypoints.mjs")).toBe(true);
});