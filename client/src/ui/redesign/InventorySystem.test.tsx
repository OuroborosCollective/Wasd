/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { InventorySystem } from "./InventorySystem";

// Mock the state and networking modules
vi.mock("../../state/playerState", () => ({
  getPlayerInventory: () => [{ id: "item1", name: "Test Item", qty: 1, rarity: "common" }],
  getPlayerGearInventory: () => [],
  getPlayerGold: () => 1000,
  subscribePlayerState: (cb: any) => () => {}
}));

vi.mock("../../networking/websocketClient", () => ({
  sendUseItem: vi.fn(),
  sendCommand: vi.fn()
}));

describe("InventorySystem Accessibility", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders with correct ARIA labels", () => {
    render(<InventorySystem onClose={() => {}} />);

    // Check close button
    const closeBtn = screen.getByLabelText("Close inventory");
    expect(closeBtn).toBeTruthy();

    // Check filter buttons
    const allFilter = screen.getByRole("button", { name: "All" });
    expect(allFilter.getAttribute("aria-pressed")).toBe("true");

    const gearFilter = screen.getByRole("button", { name: "Gear" });
    expect(gearFilter.getAttribute("aria-pressed")).toBe("false");

    // Check item slot
    const itemSlot = screen.getByRole("button", { name: "Use Test Item" });
    expect(itemSlot).toBeTruthy();
    expect(itemSlot.getAttribute("tabIndex")).toBe("0");

    // Check currency
    const goldDisplay = screen.getByLabelText("1,000 Gold");
    expect(goldDisplay).toBeTruthy();

    const gemsDisplay = screen.getByLabelText("0 Gems");
    expect(gemsDisplay).toBeTruthy();
  });

  it("handles keyboard interaction on item slots", async () => {
    const { sendUseItem } = await import("../../networking/websocketClient");
    render(<InventorySystem onClose={() => {}} />);

    const itemSlot = screen.getByRole("button", { name: "Use Test Item" });

    // Press Enter
    fireEvent.keyDown(itemSlot, { key: "Enter" });
    expect(sendUseItem).toHaveBeenCalledWith("item1");
  });
});
