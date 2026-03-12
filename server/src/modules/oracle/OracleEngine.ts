export class OracleEngine {
  generateVision() {
    const visions = [
      "Ich sehe Feuer im Norden.",
      "Unter alten Mauern liegt ein Geheimnis.",
      "Ein Königreich wird fallen."
    ];
    return visions[Math.floor(Math.random() * visions.length)];
  }
}