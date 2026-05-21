// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class GroupFinder {
  createListing(ownerId: string, activity: string) {
    return {
      ownerId,
      activity,
      createdAt: Date.now()
    };
  }
}
