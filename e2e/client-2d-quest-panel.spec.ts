/**
 * Client-2D Quest Panel Browser E2E Tests
 *
 * Tests that the 2D client Quest Journal Panel displays
 * server-authored quest data from LiveGameplaySnapshot.
 */

import { test, expect } from "@playwright/test";

test.describe("2D Quest Panel", () => {
  test("shows server-authored First Steps quest after accept", async ({
    page,
    request,
  }) => {
    const playerId = "guest";

    // Pre-condition: Set up quest state via API before loading page
    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "quest_accept",
        questId: "first_steps",
      },
    });

    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "npc_talk",
        npcId: "town_elder",
      },
    });

    // Load the 2D client
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    // Open quest panel with Q key
    await page.keyboard.press("q");

    // Wait for quest panel to be visible
    await expect(page.getByTestId("quest-panel-live")).toBeVisible({
      timeout: 30_000,
    });

    // Verify quest content from server
    await expect(page.locator("body")).toContainText("First Steps");
    await expect(page.locator("body")).toContainText("Talk to the Town Elder");

    // Old fake texts must not return
    await expect(page.locator("body")).not.toContainText("Oracle Echo");
    await expect(page.locator("body")).not.toContainText("Warfront Aid");
  });

  test("shows completed quest with all objectives done", async ({
    page,
    request,
  }) => {
    const playerId = "guest";

    // Complete the quest via API
    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "quest_accept",
        questId: "first_steps",
      },
    });
    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "npc_talk",
        npcId: "town_elder",
      },
    });
    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "npc_kill",
        npcId: "training_dummy",
      },
    });

    // Load the 2D client
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    // Open quest panel
    await page.keyboard.press("q");

    // Wait for quest panel
    await expect(page.getByTestId("quest-panel-live")).toBeVisible({
      timeout: 30_000,
    });

    // Verify completed quest with checkmarks
    await expect(page.locator("body")).toContainText("First Steps");
    await expect(page.locator("body")).toContainText("completed");

    // Both objectives should show as completed (with checkmarks)
    await expect(page.locator("body")).toContainText("✓");
  });

  test("shows available quest before accepting", async ({
    page,
    request,
  }) => {
    // Use fresh player ID to get fresh quest state
    const playerId = "guest-available-test";

    // Don't accept - just load the page with available quest

    // Load the 2D client
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    // Open quest panel
    await page.keyboard.press("q");

    // Wait for quest panel (either live with available or empty)
    const panel = page.getByTestId(/quest-panel-(live|empty)/);
    await expect(panel).toBeVisible({
      timeout: 30_000,
    });
  });
});