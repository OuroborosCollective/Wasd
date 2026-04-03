import { afterEach, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { RuntimeSettingsStore } from "../modules/world/RuntimeSettingsStore.js";

const TEST_SETTINGS_PATH = path.resolve(process.cwd(), "game-data/world/runtime-settings.test.json");

afterEach(() => {
  if (fs.existsSync(TEST_SETTINGS_PATH)) {
    fs.unlinkSync(TEST_SETTINGS_PATH);
  }
});

describe("RuntimeSettingsStore", () => {
  it("defaults to shader mode when file is missing", () => {
    const store = new RuntimeSettingsStore(TEST_SETTINGS_PATH);
    expect(store.getAREMode()).toBe("shader");
  });

  it("persists updated ARE mode to disk", () => {
    const store = new RuntimeSettingsStore(TEST_SETTINGS_PATH);
    store.setAREMode("cpu");

    const reloaded = new RuntimeSettingsStore(TEST_SETTINGS_PATH);
    expect(reloaded.getAREMode()).toBe("cpu");
  });
});
