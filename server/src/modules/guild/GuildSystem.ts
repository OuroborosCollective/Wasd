export type GuildRecord = {
  id: string;
  name: string;
  founderId: string;
  members: string[];
  ranks: Record<string, string>;
};

export class GuildSystem {
  private guilds = new Map<string, GuildRecord>();

  createGuild(id: string, name: string, founderId: string): GuildRecord {
    const guild: GuildRecord = {
      id,
      name,
      founderId,
      members: [founderId],
      ranks: { [founderId]: "founder" },
    };
    this.guilds.set(id, guild);
    return guild;
  }

  getGuild(guildId: string): GuildRecord | null {
    return this.guilds.get(guildId) ?? null;
  }

  listGuilds(): GuildRecord[] {
    return [...this.guilds.values()];
  }

  /** First guild containing the player, if any. */
  getGuildIdForPlayer(playerId: string): string | null {
    for (const g of this.guilds.values()) {
      if (g.members.includes(playerId)) return g.id;
    }
    return null;
  }

  getGuildForPlayer(playerId: string): GuildRecord | null {
    const gid = this.getGuildIdForPlayer(playerId);
    return gid ? this.getGuild(gid) : null;
  }

  addMember(guildId: string, playerId: string): GuildRecord | null {
    const guild = this.guilds.get(guildId);
    if (!guild) return null;
    if (guild.members.includes(playerId)) return guild;
    guild.members.push(playerId);
    guild.ranks[playerId] = "member";
    return guild;
  }

  removeMember(guildId: string, playerId: string): GuildRecord | null {
    const guild = this.guilds.get(guildId);
    if (!guild) return null;
    guild.members = guild.members.filter((m) => m !== playerId);
    delete guild.ranks[playerId];
    if (guild.members.length === 0) {
      this.guilds.delete(guildId);
    }
    return guild;
  }

  /** Join a guild if the player is not already in one. */
  joinGuild(guildId: string, playerId: string): GuildRecord | null {
    if (this.getGuildIdForPlayer(playerId)) return null;
    return this.addMember(guildId, playerId);
  }

  leaveGuild(playerId: string): { ok: true; guildId: string } | { ok: false; error: string } {
    const gid = this.getGuildIdForPlayer(playerId);
    if (!gid) return { ok: false, error: "not_in_guild" };
    const guild = this.guilds.get(gid);
    if (!guild) return { ok: false, error: "guild_missing" };
    if (guild.founderId === playerId && guild.members.length > 1) {
      return { ok: false, error: "founder_must_transfer" };
    }
    this.removeMember(gid, playerId);
    return { ok: true, guildId: gid };
  }
}