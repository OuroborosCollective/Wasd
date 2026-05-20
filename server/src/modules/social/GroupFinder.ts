// @ARE-GUARD-EXEMPT: non-sim module
export class GroupFinder {
  createListing(ownerId: string, activity: string) {
    return {
      ownerId,
      activity,
      createdAt: Date.now()
    };
  }
}