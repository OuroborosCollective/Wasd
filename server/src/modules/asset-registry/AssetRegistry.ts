export class AssetRegistry {
  private assets = new Map<string, any>();

  register(id: string, data: any) {
    this.assets.set(id, data);
  }

  get(id: string) {
    return this.assets.get(id) ?? null;
  }

  list() {
    return Array.from(this.assets.entries()).map(([id, data]) => ({ id, ...data }));
  }
}