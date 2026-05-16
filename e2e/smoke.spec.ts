import { test, expect } from "@playwright/test";

test("health endpoint responds", async ({ request }) => {
  const res = await request.get("/health");
  expect(res.ok()).toBeTruthy();
  const j = await res.json();
  expect(j.ok).toBe(true);
});

test("e2e-smoke page completes guest login over WebSocket", async ({
  page,
}) => {
  await page.goto("/e2e-smoke.html", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.locator("body")).toHaveAttribute("data-e2e-ready", "1", {
    timeout: 30_000,
  });
  await expect(page.locator("#e2e-status")).toHaveText("welcome");
  const raw = await page.locator("#e2e-welcome").textContent();
  expect(raw).toBeTruthy();
  if (!raw) {
    throw new Error("Missing welcome payload in #e2e-welcome");
  }
  const welcome = JSON.parse(raw);
  expect(welcome?.type).toBe("welcome");
  expect(welcome?.id || welcome?.playerId).toBeTruthy();
  if (welcome?.sceneId !== undefined) {
    expect(String(welcome.sceneId).length).toBeGreaterThan(0);
  }
  const st = welcome?.stats;
  expect(st).toBeTruthy();
  if (!st) {
    throw new Error("Welcome payload did not include stats");
  }
  expect(typeof st.gold).toBe("number");
  expect(typeof st.level).toBe("number");
  const hp = typeof st.health === "number" ? st.health : st.hp;
  const maxHp = typeof st.maxHealth === "number" ? st.maxHealth : st.maxHp;
  expect(typeof hp).toBe("number");
  expect(typeof maxHp).toBe("number");
  const mana = typeof st.mana === "number" ? st.mana : st.mp;
  const maxMana = typeof st.maxMana === "number" ? st.maxMana : st.maxMp;
  expect(typeof mana).toBe("number");
  expect(typeof maxMana).toBe("number");
  if (st.skillCooldownUntil !== undefined) {
    expect(typeof st.skillCooldownUntil).toBe("object");
  }
});
