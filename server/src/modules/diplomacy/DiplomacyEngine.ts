export class DiplomacyEngine {
  makeTreaty(a: string, b: string, type: string) {
    return { from: a, to: b, type, signedAt: Date.now() };
  }
}