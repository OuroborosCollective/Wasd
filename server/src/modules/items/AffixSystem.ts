export class AffixSystem {
  rollAffixes(pool:any[], count:number = 1) {
    return pool.slice(0, Math.max(0, count));
  }
}