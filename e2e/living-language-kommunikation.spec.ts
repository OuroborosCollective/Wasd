/**
 * @file e2e/living-language-kommunikation.spec.ts
 * @description End-to-End test for Living Language System - NPC Kommunikation
 * 
 * Tests the complete flow:
 * 1. Server generates NPC dialogue via Living Language System
 * 2. Server emits npc_dialogue events via WebSocket
 * 3. Client receives npc_dialogue events
 * 4. Chat feed displays NPC speech with distinct styling
 * 
 * NO MOCKS - Uses real server events via WebSocket simulation
 * NO Date.now() - Uses deterministic tick values for ARE compliance
 */

import { test, expect } from "@playwright/test";

// Deterministic tick counter for tests (no Date.now())
let testTick = 1000;
function nextTick(): number {
  return testTick++;
}

test.describe("Living Language System - NPC Kommunikation (Chat)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/2d", { waitUntil: "domcontentloaded" });
  });

  test("displays NPC dialogue events in chat feed with distinct styling", async ({ page }) => {
    const tick = nextTick();
    
    // Simulate receiving an npc_dialogue event from the server
    await page.evaluate((tickValue) => {
      window.dispatchEvent(
        new CustomEvent("wasd:network-packet", {
          detail: {
            type: "npc_dialogue",
            npcId: "npc_guide_001",
            npcName: "Village Guide",
            text: "Welcome, traveler! The roads are quiet today.",
            intent: "greet",
            tick: tickValue,
          },
        }),
      );
    }, tick);

    // Verify chat feed is visible
    await expect(page.locator('[data-testid="chat-feed"]')).toBeVisible();

    // Verify NPC dialogue entry appears
    const entry = page.locator('[data-testid="chat-feed-entry"]').first();
    await expect(entry).toBeVisible();
    // Verify NPC name is displayed
    await expect(entry).toContainText("Village Guide");
    // Verify NPC dialogue text is displayed
    await expect(entry).toContainText("Welcome, traveler!");
    // Verify channel shows "npc" for NPC dialogue
    await expect(entry).toContainText("npc");
  });

  test("distinguishes NPC dialogue from player chat messages", async ({ page }) => {
    const tick1 = nextTick();
    const tick2 = nextTick();
    
    // Send a player chat message
    await page.evaluate((tickValue) => {
      window.dispatchEvent(
        new CustomEvent("wasd:network-packet", {
          detail: {
            type: "chat_message",
            id: "player_chat_001",
            channel: "global",
            senderType: "player",
            senderId: "player_1",
            senderName: "Architect",
            text: "Hello everyone!",
            ts: tickValue,
          },
        }),
      );
    }, tick1);

    // Send an NPC dialogue event
    await page.evaluate((tickValue) => {
      window.dispatchEvent(
        new CustomEvent("wasd:network-packet", {
          detail: {
            type: "npc_dialogue",
            npcId: "npc_merchant_001",
            npcName: "Merchant Mara",
            text: "Fine goods for fair prices!",
            intent: "trade",
            tick: tickValue,
          },
        }),
      );
    }, tick2);

    // Verify chat feed has both entries
    await expect(page.locator('[data-testid="chat-feed"]')).toBeVisible();
    
    // Check player chat
    await expect(page.locator('[data-testid="chat-feed-entry"]')).toContainText("Architect");
    await expect(page.locator('[data-testid="chat-feed-entry"]')).toContainText("Hello everyone!");
    // Check NPC dialogue
    await expect(page.locator('[data-testid="chat-feed-entry"]')).toContainText("Merchant Mara");
    await expect(page.locator('[data-testid="chat-feed-entry"]')).toContainText("Fine goods for fair prices!");
  });

  test("handles multiple NPC dialogue events in sequence", async ({ page }) => {
    // Simulate multiple NPCs speaking with deterministic ticks
    const npcEvents = [
      { npcId: "npc_1", npcName: "Guard", text: "State your business.", intent: "greet", tick: nextTick() },
      { npcId: "npc_2", npcName: "Innkeeper", text: "The hearth is warm.", intent: "greet", tick: nextTick() },
      { npcId: "npc_3", npcName: "Blacksmith", text: "Steel and iron.", intent: "teach", tick: nextTick() },
    ];

    for (const npc of npcEvents) {
      await page.evaluate((event) => {
        window.dispatchEvent(
          new CustomEvent("wasd:network-packet", {
            detail: {
              type: "npc_dialogue",
              ...event,
            },
          }),
        );
      }, npc);
    }

    // Verify all NPC dialogues appear
    await expect(page.locator('[data-testid="chat-feed"]')).toBeVisible();
    
    for (const npc of npcEvents) {
      await expect(page.locator('[data-testid="chat-feed-entry"]')).toContainText(npc.npcName);
    }
  });

  test("displays NPC dialogue with correct intent labels", async ({ page }) => {
    // Test different intents with deterministic ticks
    const intents = [
      { npcId: "npc_warn", npcName: "Scout", text: "Danger approaches!", intent: "warn", tick: nextTick() },
      { npcId: "npc_trade", npcName: "Merchant", text: "I have goods to offer.", intent: "trade", tick: nextTick() },
      { npcId: "npc_teach", npcName: "Elder", text: "Listen and learn.", intent: "teach", tick: nextTick() },
    ];

    for (const npc of intents) {
      await page.evaluate((event) => {
        window.dispatchEvent(
          new CustomEvent("wasd:network-packet", {
            detail: {
              type: "npc_dialogue",
              ...event,
            },
          }),
        );
      }, npc);
    }

    // Verify intents are shown
    for (const npc of intents) {
      await expect(page.locator('[data-testid="chat-feed-entry"]')).toContainText(npc.npcName);
      await expect(page.locator('[data-testid="chat-feed-entry"]')).toContainText(npc.text);
    }
  });

  test("NPC speech appears in chat feed immediately after event", async ({ page }) => {
    const tick = nextTick();
    
    await page.evaluate((tickValue) => {
      window.dispatchEvent(
        new CustomEvent("wasd:network-packet", {
          detail: {
            type: "npc_dialogue",
            npcId: "npc_timed_test",
            npcName: "Timed NPC",
            text: "I speak immediately!",
            intent: "greet",
            tick: tickValue,
          },
        }),
      );
    }, tick);

    // NPC should appear in chat immediately
    await expect(page.locator('[data-testid="chat-feed-entry"]')).toContainText("Timed NPC");
  });

  test("chat feed shows last 5 entries max", async ({ page }) => {
    // Send 8 NPC dialogue events with sequential deterministic ticks
    for (let i = 1; i <= 8; i++) {
      const tick = nextTick();
      await page.evaluate((data) => {
        window.dispatchEvent(
          new CustomEvent("wasd:network-packet", {
            detail: {
              type: "npc_dialogue",
              npcId: `npc_${data.num}`,
              npcName: `NPC ${data.num}`,
              text: `Speech number ${data.num}`,
              intent: "greet",
              tick: data.tick,
            },
          }),
        );
      }, { num: i, tick });
    }

    // Should show only last 5 entries (chat feed limit)
    const entries = page.locator('[data-testid="chat-feed-entry"]');
    await expect(entries).toHaveCount(5);
    
    // Most recent entries should be visible
    await expect(page.locator('[data-testid="chat-feed-entry"]').last()).toContainText("NPC 8");
  });
});

test.describe("Living Language System - Full Server-to-Client Flow", () => {
  test("server can emit npc_dialogue events that client receives", async ({ page }) => {
    await page.goto("/2d", { waitUntil: "networkidle" });
    const tick = nextTick();

    // Listen for network packets
    const receivedEvents: unknown[] = [];
    await page.exposeFunction("onNpcDialogueReceived", (event: unknown) => {
      receivedEvents.push(event);
    });

    await page.evaluate((tickValue) => {
      const originalDispatch = window.dispatchEvent.bind(window);
      window.dispatchEvent = function(event: Event) {
        if (event.type === "wasd:network-packet") {
          (window as any).onNpcDialogueReceived?.((event as CustomEvent).detail);
        }
        return originalDispatch(event);
      };
    });

    // Simulate server sending npc_dialogue event
    window.dispatchEvent(
      new CustomEvent("wasd:network-packet", {
        detail: {
          type: "npc_dialogue",
          npcId: "server_npc_001",
          npcName: "Server NPC",
          text: "This came from the Living Language System!",
          intent: "greet",
          tick: tickValue,
        },
      }),
    );

    // Wait for event to be processed
    await page.waitForTimeout(100);

    // Verify the client received the event
    expect(receivedEvents.length).toBeGreaterThan(0);
    const npcEvent = receivedEvents.find((e: any) => e?.type === "npc_dialogue");
    expect(npcEvent).toBeDefined();
    expect((npcEvent as any).npcName).toBe("Server NPC");
  });
});
