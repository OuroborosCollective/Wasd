export type TeamId = "sun" | "moon";

export interface BattleUnit {
  id: string;
  team: TeamId;
  hp: number;
  attack: number;
  armor: number;
  speed: number;
}

export interface BattleEvent {
  tick: number;
  actorId: string;
  targetId: string;
  damage: number;
  targetHp: number;
  summary: string;
}

export interface BattleFrame {
  tick: number;
  worldHash: string;
  seed: string;
  units: BattleUnit[];
  events: BattleEvent[];
  winner: TeamId | "draw" | null;
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function stableValue(hash: string, offset: number, modulo: number): number {
  return Number.parseInt(hash.slice(offset, offset + 8), 16) % modulo;
}

function cloneUnits(units: BattleUnit[]): BattleUnit[] {
  return units.map((unit) => ({ ...unit }));
}

function alive(units: BattleUnit[], team?: TeamId): BattleUnit[] {
  return units.filter((unit) => unit.hp > 0 && (!team || unit.team === team));
}

function opponent(team: TeamId): TeamId {
  return team === "sun" ? "moon" : "sun";
}

export function createBattleTeams(): BattleUnit[] {
  return [
    { id: "sun-vanguard", team: "sun", hp: 44, attack: 9, armor: 2, speed: 3 },
    { id: "sun-oracle", team: "sun", hp: 30, attack: 12, armor: 1, speed: 5 },
    { id: "sun-warden", team: "sun", hp: 52, attack: 7, armor: 4, speed: 2 },
    { id: "moon-raider", team: "moon", hp: 38, attack: 11, armor: 2, speed: 4 },
    { id: "moon-sentinel", team: "moon", hp: 55, attack: 6, armor: 5, speed: 2 },
    { id: "moon-singer", team: "moon", hp: 28, attack: 13, armor: 1, speed: 5 },
  ];
}

export class BrowserBattleSim {
  private readonly frames: BattleFrame[] = [];

  constructor(private readonly seed = "ARE|autobattler|browser-demo") {}

  async run(maxTicks = 60, startUnits = createBattleTeams()): Promise<BattleFrame[]> {
    this.frames.length = 0;
    let units = cloneUnits(startUnits);

    for (let tick = 1; tick <= maxTicks; tick += 1) {
      const deterministicSeed = `${this.seed}|kappa:1000|tick:${tick}`;
      const worldHash = await sha256(JSON.stringify({ deterministicSeed, tick, units }));
      const events: BattleEvent[] = [];
      const turnOrder = alive(units).sort((a, b) => b.speed - a.speed || a.id.localeCompare(b.id));

      for (const actor of turnOrder) {
        const liveActor = units.find((unit) => unit.id === actor.id && unit.hp > 0);
        if (!liveActor) continue;
        const targets = alive(units, opponent(liveActor.team)).sort((a, b) => a.hp - b.hp || a.id.localeCompare(b.id));
        if (targets.length === 0) break;
        const target = targets[stableValue(worldHash, tick + liveActor.id.length, targets.length)];
        const liveTarget = units.find((unit) => unit.id === target.id);
        if (!liveTarget) continue;
        const variance = stableValue(worldHash, tick + liveTarget.id.length, 4);
        const damage = Math.max(1, liveActor.attack + variance - liveTarget.armor);
        liveTarget.hp = Math.max(0, liveTarget.hp - damage);
        events.push({
          tick,
          actorId: liveActor.id,
          targetId: liveTarget.id,
          damage,
          targetHp: liveTarget.hp,
          summary: `${liveActor.id} strikes ${liveTarget.id} for ${damage} via hash ${worldHash.slice(0, 8)}`,
        });
      }

      const winner = this.resolveWinner(units);
      const frame: BattleFrame = { tick, worldHash, seed: deterministicSeed, units: cloneUnits(units), events, winner };
      this.frames.push(frame);
      if (winner) break;
    }

    return this.getReplayData();
  }

  getReplayData(): BattleFrame[] {
    return this.frames.map((frame) => ({ ...frame, units: cloneUnits(frame.units), events: frame.events.map((event) => ({ ...event })) }));
  }

  private resolveWinner(units: BattleUnit[]): TeamId | "draw" | null {
    const sunAlive = alive(units, "sun").length;
    const moonAlive = alive(units, "moon").length;
    if (sunAlive === 0 && moonAlive === 0) return "draw";
    if (sunAlive === 0) return "moon";
    if (moonAlive === 0) return "sun";
    return null;
  }
}
