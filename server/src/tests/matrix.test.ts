import { describe, it, expect, beforeEach } from "vitest";
import { MatrixEnergySystem } from "../modules/economy/MatrixEnergySystem.js";

describe("MatrixEnergySystem", () => {
  let system: MatrixEnergySystem;

  beforeEach(() => {
    system = new MatrixEnergySystem();
  });

  it("should add and track balance", () => {
    system.add("player1", 100);
    expect(system.getBalance("player1")).toBe(100);
  });

  it("should consume energy if balance is sufficient", () => {
    system.add("player1", 100);
    const success = system.consume("player1", 50);
    expect(success).toBe(true);
    expect(system.getBalance("player1")).toBe(50);
  });

  it("should not consume energy if balance is insufficient", () => {
    system.add("player1", 40);
    const success = system.consume("player1", 50);
    expect(success).toBe(false);
    expect(system.getBalance("player1")).toBe(40);
  });

  it("should regenerate energy on tick", () => {
    system.add("player1", 100);
    system.tick(["player1"]);
    // Assuming default regeneration is 1 unit per tick
    expect(system.getBalance("player1")).toBe(101);
  });
});
