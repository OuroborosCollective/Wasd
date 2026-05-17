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

  createGuild(id: string, name: string, founderId: string): GuildRecord {
    const guild: GuildRecord = {
      id,
      name: String(name || id).trim() || id,
      founderId,
      members: [founderId],
      ranks: { [founderId]: "founder" },
      createdAt: Date.now(),
    };
    this.guilds.set(id, guild);
    return guild;
  }

  /** Idempotent friendly create: returns existing guild if player already leads one. */
  createGuildForPlayer(playerId: string, name: string): { guild: GuildRecord; created: boolean } {
    const existing = this.findGuildByMember(playerId);
    if (existing && existing.ranks[playerId] === "founder") {
      return { guild: existing, created: false };
    }
    const id = `g_${playerId.slice(0, 8)}_${Date.now().toString(36)}`;
    return { guild: this.createGuild(id, name, playerId), created: true };
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
      return null;
    }
    if (!guild.ranks[guild.founderId]) {
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

  findGuildByMember(playerId: string): GuildRecord | null {
    for (const g of this.guilds.values()) {
      if (g.members.includes(playerId)) return g;
    }
    return null;
  }

  listGuildSummaries(): Array<{ id: string; name: string; memberCount: number }> {
    return [...this.guilds.values()].map((g) => ({
      id: g.id,
      name: g.name,
      memberCount: g.members.length,
    }));
  }
}