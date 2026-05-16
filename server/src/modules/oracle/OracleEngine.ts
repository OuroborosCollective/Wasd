import { createARESeed, type ARERng, SeededARERng } from "../../core/determinism/AREDeterminism.js";

export class OracleEngine {
  generateVision(rng: ARERng = new SeededARERng(createARESeed(["oracle", "vision"]))) {
    const visions = [
      "Ich sehe Feuer im Norden.",
      "Unter alten Mauern liegt ein Geheimnis.",
      "Ein Königreich wird fallen."
    ];
    return visions[rng.nextInt(visions.length)];
  }
}
