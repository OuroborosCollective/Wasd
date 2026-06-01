export class DiplomacyEngine {
  makeTreaty(a: string, b: string, type: string) {
    return { from: a, to: b, type, signedAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ };
  }
}