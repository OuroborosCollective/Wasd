export interface GuildRecord {
  readonly id: string;
  readonly name: string;
  readonly founderId: string;
  readonly members: readonly string[];
  readonly ranks: Readonly<Record<string, string>>;
  readonly treasury?: number;
}

export class GuildSystem {
  private guilds = new Map<string, GuildRecord>();

  createGuild(id: string, name: string, founderId: string): GuildRecord {
    const guild: GuildRecord = Object.freeze({
      id,
      name,
      founderId,
      members: Object.freeze([founderId]),
      ranks: Object.freeze({ [founderId]: "founder" }),
      treasury: 0,
    });
    this.guilds.set(id, guild);
    return guild;
  }

  addMember(guildId: string, playerId: string): GuildRecord | null {
    const guild = this.guilds.get(guildId);
    if (!guild) return null;
    if (guild.members.includes(playerId)) return guild;

    const nextGuild: GuildRecord = Object.freeze({
      ...guild,
      members: Object.freeze([...guild.members, playerId].sort()),
      ranks: Object.freeze({ ...guild.ranks, [playerId]: "member" }),
    });
    this.guilds.set(guildId, nextGuild);
    return nextGuild;
  }

  getGuild(guildId: string): GuildRecord | null {
    return this.guilds.get(guildId) ?? null;
  }

  getGuildForPlayer(playerId: string): GuildRecord | null {
    if (!playerId) return null;
    const guilds = [...this.guilds.values()].sort((a, b) => a.id.localeCompare(b.id));
    return guilds.find((guild) => guild.members.includes(playerId)) ?? null;
  }

  listGuilds(): readonly GuildRecord[] {
    return Object.freeze([...this.guilds.values()].sort((a, b) => a.id.localeCompare(b.id)));
  }

  clearForTests(): void {
    this.guilds.clear();
  }
}

export const guildSystem = new GuildSystem();
