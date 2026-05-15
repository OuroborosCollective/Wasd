export type GuildRank = "founder" | "officer" | "member";

export type GuildRecord = {
  id: string;
  name: string;
  founderId: string;
  members: string[];
  ranks: Record<string, GuildRank>;
  createdAt: number;
};

export class GuildSystem {
  private guilds = new Map<string, GuildRecord>();
  private playerGuild = new Map<string, string>();

  createGuild(id: string, name: string, founderId: string): GuildRecord {
    if (this.playerGuild.has(founderId)) {
      throw new Error("player_already_in_guild");
    }
    const guild: GuildRecord = {
      id,
      name,
      founderId,
      members: [founderId],
      ranks: { [founderId]: "founder" },
      createdAt: Date.now(),
    };
    this.guilds.set(id, guild);
    this.playerGuild.set(founderId, id);
    return guild;
  }

  /** Create a guild with an auto id and register the founder. */
  createGuildAuto(name: string, founderId: string): GuildRecord {
    const id = `guild_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    return this.createGuild(id, name.trim() || "Unnamed Guild", founderId);
  }

  addMember(guildId: string, playerId: string): GuildRecord | null {
    const guild = this.guilds.get(guildId);
    if (!guild) return null;
    if (guild.members.includes(playerId)) return guild;
    guild.members.push(playerId);
    guild.ranks[playerId] = "member";
    this.playerGuild.set(playerId, guildId);
    return guild;
  }

  leaveGuild(playerId: string): GuildRecord | null {
    const guildId = this.playerGuild.get(playerId);
    if (!guildId) return null;
    const guild = this.guilds.get(guildId);
    if (!guild) {
      this.playerGuild.delete(playerId);
      return null;
    }
    guild.members = guild.members.filter((m) => m !== playerId);
    delete guild.ranks[playerId];
    this.playerGuild.delete(playerId);
    if (guild.members.length === 0) {
      this.guilds.delete(guildId);
      return null;
    }
    if (guild.founderId === playerId) {
      const next = guild.members[0];
      if (next) {
        guild.founderId = next;
        guild.ranks[next] = "founder";
      }
    }
    return guild;
  }

  getGuild(guildId: string): GuildRecord | undefined {
    return this.guilds.get(guildId);
  }

  getGuildIdForPlayer(playerId: string): string | undefined {
    return this.playerGuild.get(playerId);
  }

  getGuildForPlayer(playerId: string): GuildRecord | undefined {
    const gid = this.playerGuild.get(playerId);
    return gid ? this.guilds.get(gid) : undefined;
  }

  listGuilds(): GuildRecord[] {
    return [...this.guilds.values()];
  }

  /** Compact DTO for WS / welcome payloads (no rank map leak beyond members). */
  toClientDto(guild: GuildRecord) {
    return {
      id: guild.id,
      name: guild.name,
      founderId: guild.founderId,
      members: [...guild.members],
      ranks: { ...guild.ranks },
      memberCount: guild.members.length,
    };
  }
}
