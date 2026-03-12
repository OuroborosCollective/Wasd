export class GuildSystem {
  private guilds = new Map<string, any>();

  createGuild(id: string, name: string, founderId: string) {
    const guild = {
      id,
      name,
      founderId,
      members: [founderId],
      ranks: { [founderId]: "founder" }
    };
    this.guilds.set(id, guild);
    return guild;
  }

  addMember(guildId: string, playerId: string) {
    const guild = this.guilds.get(guildId);
    if (!guild) return null;
    guild.members.push(playerId);
    guild.ranks[playerId] = "member";
    return guild;
  }
}