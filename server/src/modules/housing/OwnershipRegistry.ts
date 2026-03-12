export class OwnershipRegistry {
  private registry = new Map<string, { ownerType: string; ownerId: string }>();

  register(objectId: string, ownerType: string, ownerId: string) {
    this.registry.set(objectId, { ownerType, ownerId });
  }

  get(objectId: string) {
    return this.registry.get(objectId) || null;
  }
}