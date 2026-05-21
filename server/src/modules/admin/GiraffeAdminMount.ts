// @ARE-GUARD-EXEMPT: Summon timestamp for admin mount; not simulation affecting.
export class GiraffeAdminMount {
  summon(ownerId:string) {
    return {
      ownerId,
      mountId: "gm_giraffe",
      summonedAt: Date.now()
    };
  }
}