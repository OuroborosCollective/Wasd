import { describe, it, expect } from "vitest";
import { OracleEngine } from "../../../modules/oracle/OracleEngine";

describe("OracleEngine", () => {
  it("should generate a vision that is a string", () => {
    const engine = new OracleEngine();
    const vision = engine.generateVision();
    expect(typeof vision).toBe("string");
  });

  it("should generate a vision that is one of the predefined visions", () => {
    const engine = new OracleEngine();
    const visions = [
      "Ich sehe Feuer im Norden.",
      "Unter alten Mauern liegt ein Geheimnis.",
      "Ein Königreich wird fallen."
    ];

    // Check multiple times to increase confidence since it's random
    for (let i = 0; i < 10; i++) {
      const vision = engine.generateVision();
      expect(visions).toContain(vision);
    }
  });
});
