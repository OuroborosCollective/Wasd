import { afterEach, describe, expect, it, vi } from "vitest";
import { dispatchEquip, dispatchUnequip } from "../src/game/gameplayActions";

function jsonResponse(ok: boolean, body: unknown): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

describe("equipment gameplay actions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends equip intent and refreshes the authoritative gameplay snapshot", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(true, {
        ok: true,
        result: {
          ok: true,
          reason: "equipped",
          itemId: "wooden_axe",
        },
      }))
      .mockResolvedValueOnce(jsonResponse(true, {
        ok: true,
        snapshot: {
          status: "live",
          serverTick: 10,
          character: null,
          paperdoll: {
            character: null,
            slots: [
              { slotId: "woodcutting_tool", itemId: "wooden_axe", title: "Wooden Axe" },
            ],
          },
          equipment: {
            playerId: "player-test",
            schemaVersion: 1,
            slots: [
              { slotId: "woodcutting_tool", itemId: "wooden_axe", title: "Wooden Axe", tier: 1 },
            ],
          },
        },
      }));

    vi.stubGlobal("fetch", fetchMock);

    const result = await dispatchEquip({ playerId: "player-test", itemId: "wooden_axe" });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/equipment/equip");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-player-id": "player-test",
      },
      body: JSON.stringify({ playerId: "player-test", itemId: "wooden_axe" }),
    });
    expect(String(fetchMock.mock.calls[1][0])).toContain("/api/gameplay/snapshot");
  });

  it("returns server rejection reason for unequip without fetching a success snapshot", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(false, {
      ok: false,
      result: {
        ok: false,
        reason: "slot_empty",
      },
    }));

    vi.stubGlobal("fetch", fetchMock);

    const result = await dispatchUnequip({ playerId: "player-test", slotId: "weapon" });

    expect(result).toEqual({ ok: false, error: "slot_empty" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/equipment/unequip");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-player-id": "player-test",
      },
      body: JSON.stringify({ playerId: "player-test", slotId: "weapon" }),
    });
  });
});
