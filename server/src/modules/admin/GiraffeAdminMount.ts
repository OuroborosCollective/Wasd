// @ARE-GUARD-EXEMPT: Infrastructure/Meta/Telemetry logic; not world-state critical.
export class GiraffeAdminMount {
  summon(ownerId:string) {
    return {
      ownerId,
      mountId: "gm_giraffe",
      summonedAt: Date.now()
    };
  }
}