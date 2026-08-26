import { test, expect } from "@playwright/test";

test.describe("Client 2D chat feed binding", () => {
  test("renders incoming chat_message packets in the 2D HUD", async ({ page }) => {
    await page.goto("/2d", { waitUntil: "domcontentloaded" });

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("wasd:network-packet", {
          detail: {
            type: "chat_message",
            id: "e2e_oracle_chat_0001",
            channel: "global",
            senderType: "system",
            senderId: "oracle",
            senderName: "[ORACLE]",
            text: "E2E prophecy message arrived",
            ts: 1234,
          },
        }),
      );
    });

    await expect(page.locator('[data-testid="chat-feed"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-feed-entry"]')).toContainText("[ORACLE]");
    await expect(page.locator('[data-testid="chat-feed-entry"]')).toContainText("E2E prophecy message arrived");
  });
});
