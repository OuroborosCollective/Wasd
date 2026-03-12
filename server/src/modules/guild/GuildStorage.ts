export class GuildStorage {
  private storage = new Map<string, any[]>();

  addItem(guildId: string, item: any) {
    if (!this.storage.has(guildId)) this.storage.set(guildId, []);
    this.storage.get(guildId)!.push(item);
    return this.storage.get(guildId)!;
  }

  getItems(guildId: string) {
    return this.storage.get(guildId) || [];
  }
}