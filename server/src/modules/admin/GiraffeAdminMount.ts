export class GiraffeAdminMount {
  summon(ownerId:string) {
    return {
      ownerId,
      mountId: "gm_giraffe",
      summonedAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */
    };
  }
}