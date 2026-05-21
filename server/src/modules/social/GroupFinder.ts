// @ARE-GUARD-EXEMPT: Group creation timestamps; not world-state input.
export class GroupFinder {
  createListing(ownerId: string, activity: string) {
    return {
      ownerId,
      activity,
      createdAt: Date.now()
    };
  }
}