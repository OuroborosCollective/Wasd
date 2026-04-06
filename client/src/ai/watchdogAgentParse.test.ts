import { describe, expect, it } from "vitest";
import {
  parseWatchdogAgentJson,
  stripWatchdogJsonFence,
} from "./watchdogAgentParse";

describe("watchdogAgentParse", () => {
  describe("stripWatchdogJsonFence", () => {
    it("unwraps markdown json fence", () => {
      expect(
        stripWatchdogJsonFence('```json\n{"module":"network","action":"none"}\n```')
      ).toBe('{"module":"network","action":"none"}');
    });

    it("returns trimmed text when no fence", () => {
      expect(stripWatchdogJsonFence('  {"a":1}  ')).toBe('{"a":1}');
    });
  });

  describe("parseWatchdogAgentJson", () => {
    it("accepts valid JSON for expected module and allowed action", () => {
      const raw = '{"module":"network","action":"reconnect_websocket","reason":"ws drop"}';
      expect(parseWatchdogAgentJson(raw, "network")).toEqual({
        module: "network",
        action: "reconnect_websocket",
        reason: "ws drop",
      });
    });

    it("rejects when module does not match classified domain", () => {
      const raw = '{"module":"renderer","action":"babylon_soft_recover"}';
      expect(parseWatchdogAgentJson(raw, "network")).toBeNull();
    });

    it("rejects action not in module allow list", () => {
      const raw = '{"module":"network","action":"babylon_soft_recover"}';
      expect(parseWatchdogAgentJson(raw, "network")).toBeNull();
    });

    it("extracts first JSON object from noisy model output", () => {
      const raw = 'Here you go:\n```json\n{"module":"storage","action":"clear_game_local_storage"}\n```\nDone.';
      expect(parseWatchdogAgentJson(raw, "storage")).toEqual({
        module: "storage",
        action: "clear_game_local_storage",
        reason: undefined,
      });
    });

    it("returns null for invalid JSON", () => {
      expect(parseWatchdogAgentJson("{broken", "unknown")).toBeNull();
    });

    it("returns null when braces are missing", () => {
      expect(parseWatchdogAgentJson("no json here", "network")).toBeNull();
    });
  });
});
