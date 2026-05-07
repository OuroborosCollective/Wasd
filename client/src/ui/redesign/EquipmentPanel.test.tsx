/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { EquipmentPanel } from "./EquipmentPanel";

// Mock the state and networking modules
vi.mock("../../state/playerState", () => ({
  getPlayerEquipment: () => ({
    head: { id: "helm1", name: "Steel Helm" },
    weapon: { id: "sword1", name: "Iron Sword" },
    chest: null
  }),
  subscribePlayerState: (cb: any) => () => {}
}));

vi.mock("../../networking/websocketClient", () => ({
  sendUnequipItem: vi.fn(),
  sendCommand: vi.fn()
}));

describe("EquipmentPanel Accessibility", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders with correct ARIA labels", () => {
    render(<EquipmentPanel onClose={() => {}} />);

    // Check close button
    const closeBtn = screen.getByLabelText("Close equipment panel");
    expect(closeBtn).toBeTruthy();

    // Check equipped item slot
    const helmSlot = screen.getByRole("button", { name: "Unequip Steel Helm from Head" });
    expect(helmSlot).toBeTruthy();
    expect(helmSlot.getAttribute("tabIndex")).toBe("0");

    // Check empty slot
    const chestSlot = screen.getByRole("button", { name: "Empty Chest slot" });
    expect(chestSlot).toBeTruthy();
    expect(chestSlot.getAttribute("tabIndex")).toBe("0");
  });

  it("handles keyboard interaction on equipment slots", async () => {
    const { sendUnequipItem } = await import("../../networking/websocketClient");
    render(<EquipmentPanel onClose={() => {}} />);

    const helmSlot = screen.getByRole("button", { name: "Unequip Steel Helm from Head" });

    // Press Enter
    fireEvent.keyDown(helmSlot, { key: "Enter" });
    expect(sendUnequipItem).toHaveBeenCalledWith("armor");

    // Press Space
    fireEvent.keyDown(helmSlot, { key: " " });
    expect(sendUnequipItem).toHaveBeenCalledTimes(2);
  });

  it("does not trigger unequip for empty slots on keyboard interaction", async () => {
    const { sendUnequipItem } = await import("../../networking/websocketClient");
    render(<EquipmentPanel onClose={() => {}} />);

    const chestSlot = screen.getByRole("button", { name: "Empty Chest slot" });

    // Press Enter
    fireEvent.keyDown(chestSlot, { key: "Enter" });
    expect(sendUnequipItem).not.toHaveBeenCalled();
  });
});
