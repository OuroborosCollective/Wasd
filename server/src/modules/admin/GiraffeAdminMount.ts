export class GiraffeAdminMount {
  summon(ownerId:string) {
    return {
      ownerId,
      mountId: "gm_giraffe",
      summonedAt: Date.now()
    };
  }
}