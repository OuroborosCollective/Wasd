export class ReputationTitleBridge {
  resolveTitle(score: number) {
    if (score >= 1000) return "Renowned";
    if (score >= 500) return "Honored";
    if (score >= 100) return "Known";
    return "Unknown";
  }
}