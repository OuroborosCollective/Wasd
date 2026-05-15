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

  /** Allocate an id and create a guild (player convenience). */
  createGuildAuto(name: string, founderId: string): GuildRecord {
    const id = `guild_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    return this.createGuild(id, name, founderId);
  }

  getGuild(guildId: string): GuildRecord | undefined {
    return this.guilds.get(guildId);
  }

  listGuilds(): GuildRecord[] {
    return [...this.guilds.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  getGuildIdForPlayer(playerId: string): string | null {
    return this.playerGuild.get(playerId) ?? null;
  }

  getGuildSummaryForPlayer(playerId: string): { id: string; name: string; rank: GuildRank } | null {
    const gid = this.playerGuild.get(playerId);
    if (!gid) return null;
    const g = this.guilds.get(gid);
    if (!g) return null;
    const rank = g.ranks[playerId] ?? "member";
    return { id: g.id, name: g.name, rank };
  }

  addMember(guildId: string, playerId: string): GuildRecord | null {
    if (this.playerGuild.has(playerId)) return null;
    const guild = this.guilds.get(guildId);
    if (!guild) return null;
    if (guild.members.includes(playerId)) return guild;
    guild.members.push(playerId);
    guild.ranks[playerId] = "member";
    this.playerGuild.set(playerId, guildId);
    return guild;
  }

  leaveGuild(playerId: string): { ok: boolean; reason?: string } {
    const gid = this.playerGuild.get(playerId);
    if (!gid) return { ok: false, reason: "not_in_guild" };
    const guild = this.guilds.get(gid);
    if (!guild) {
      this.playerGuild.delete(playerId);
      return { ok: false, reason: "guild_missing" };
    }
    const rank = guild.ranks[playerId];
    if (rank === "founder" && guild.members.length > 1) {
      return { ok: false, reason: "founder_must_transfer" };
    }
    guild.members = guild.members.filter((m) => m !== playerId);
    delete guild.ranks[playerId];
    this.playerGuild.delete(playerId);
    if (guild.members.length === 0) {
      this.guilds.delete(gid);
    }
    return { ok: true };
  }

  /** Founder-only: removes the guild and clears all member mappings. */
  disbandGuild(guildId: string, playerId: string): { ok: boolean; reason?: string } {
    const guild = this.guilds.get(guildId);
    if (!guild) return { ok: false, reason: "not_found" };
    if (guild.founderId !== playerId) return { ok: false, reason: "not_founder" };
    for (const m of guild.members) {
      this.playerGuild.delete(m);
    }
    this.guilds.delete(guildId);
    return { ok: true };
  }
}
