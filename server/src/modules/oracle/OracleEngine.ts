import { HeuristicWorldBrain } from "../brain/HeuristicWorldBrain.js";

export class OracleEngine {
  generateVision(brainState: any) {
    const { centerValue, activeAnomalies, summary } = brainState;

    if (activeAnomalies.includes("MARKET_CRASH_PROBABLE")) {
      return "The golden scales tilt towards darkness; a hunger for coins will soon go unquenched.";
    }

    if (centerValue > 0.75) {
      return "I hear the drums of the deep. Blood will water the roots of Areloria.";
    }

    if (centerValue < 0.25) {
      return "A stillness falls upon the world. The winds have forgotten how to whisper.";
    }

    const genericVisions = [
      "The stars align over the ancient ruins.",
      "A stranger carries the key to a forgotten gate.",
      "The matrix energy flows with unusual vigor today.",
      "Shadows lengthen in the south."
    ];

    return genericVisions[Math.floor(Math.random() * genericVisions.length)];
  }
}
