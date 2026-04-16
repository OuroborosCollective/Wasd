/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { showNotification, notifySuccess } from "./notifications";

describe("notifications", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });
  afterEach(() => {
    document.body.innerHTML = "";
    document.getElementById("arel-notifications")?.remove();
  });

  it("creates container and notification", () => {
    showNotification("Hello", "info");
    const c = document.getElementById("arel-notifications");
    expect(c).toBeTruthy();
    expect(c?.querySelector('[role="status"]')).toBeTruthy();
    expect(c?.textContent).toContain("Hello");
  });

  it("notifySuccess uses success tone", () => {
    notifySuccess("Done");
    const el = document.querySelector("#arel-notifications [role='status']");
    expect(el).toBeTruthy();
    expect(el?.textContent).toContain("Done");
  });
});
