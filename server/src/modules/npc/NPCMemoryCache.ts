/**
 * NPCMemoryCache — Layer 1: in-process fast ephemeral memory for NPC agents.
 *
 * Every NPC decision MUST read from this cache first.
 * Dirty entries are periodically flushed to Supabase (Layer 2).
 */

/** Per-weight heuristic that influences NPC behaviour. */
export interface HeuristicWeights {
  aggression: number;
  tradeWillingness: number;
  partySeeking: number;
  chatFrequency: number;
  fleeThreshold: number;
  [key: string]: number;
}

export interface TradeRecord {
  itemId: string;
  price: number;
  success: boolean;
  ts: number;
}

export interface ReputationEntry {
  playerId: string;
  score: number;
  lastUpdated: number;
}

export interface NPCMemoryState {
  npcId: string;
  currentGoal: string;
  shortTermObservations: string[];
  recentChatSeen: Array<{ text: string; sender: string; channel: string; ts: number }>;
  heuristicWeights: HeuristicWeights;
  longTermGoals: string[];
  tradeHistory: TradeRecord[];
  reputation: ReputationEntry[];
  eventLog: Array<{ event: string; ts: number }>;
  cooldowns: Record<string, number>;
  partyId: string | null;
  tradeState: string | null;
  dirty: boolean;
  lastSaved: number;
}

const MAX_SHORT_TERM = 30;
const MAX_CHAT_SEEN = 40;
const MAX_EVENT_LOG = 100;
const MAX_TRADE_HISTORY = 50;

export function defaultHeuristicWeights(): HeuristicWeights {
  return {
    aggression: 0.5,
    tradeWillingness: 0.5,
    partySeeking: 0.3,
    chatFrequency: 0.4,
    fleeThreshold: 0.3,
  };
}

function createEmpty(npcId: string): NPCMemoryState {
  return {
    npcId,
    currentGoal: "idle",
    shortTermObservations: [],
    recentChatSeen: [],
    heuristicWeights: defaultHeuristicWeights(),
    longTermGoals: [],
    tradeHistory: [],
    reputation: [],
    eventLog: [],
    cooldowns: {},
    partyId: null,
    tradeState: null,
    dirty: false,
    lastSaved: 0,
  };
}

export class NPCMemoryCache {
  private cache = new Map<string, NPCMemoryState>();

  /** Get or create memory state for an NPC. */
  get(npcId: string): NPCMemoryState {
    let s = this.cache.get(npcId);
    if (!s) {
      s = createEmpty(npcId);
      this.cache.set(npcId, s);
    }
    return s;
  }

  has(npcId: string): boolean {
    return this.cache.has(npcId);
  }

  /** Hydrate from Supabase row data. */
  hydrate(npcId: string, row: Partial<NPCMemoryState>): void {
    const s = this.get(npcId);
    if (row.heuristicWeights) s.heuristicWeights = { ...defaultHeuristicWeights(), ...row.heuristicWeights };
    if (row.longTermGoals) s.longTermGoals = row.longTermGoals;
    if (row.tradeHistory) s.tradeHistory = row.tradeHistory.slice(-MAX_TRADE_HISTORY);
    if (row.reputation) s.reputation = row.reputation;
    if (row.eventLog) s.eventLog = row.eventLog.slice(-MAX_EVENT_LOG);
    if (row.currentGoal) s.currentGoal = row.currentGoal;
    s.dirty = false;
  }

  /** Record an observation (short-term). */
  observe(npcId: string, observation: string): void {
    const s = this.get(npcId);
    s.shortTermObservations.push(observation);
    if (s.shortTermObservations.length > MAX_SHORT_TERM) {
      s.shortTermObservations = s.shortTermObservations.slice(-MAX_SHORT_TERM);
    }
    s.dirty = true;
  }

  /** Record a chat message the NPC has seen. */
  recordChat(npcId: string, entry: { text: string; sender: string; channel: string; ts: number }): void {
    const s = this.get(npcId);
    s.recentChatSeen.push(entry);
    if (s.recentChatSeen.length > MAX_CHAT_SEEN) {
      s.recentChatSeen = s.recentChatSeen.slice(-MAX_CHAT_SEEN);
    }
  }

  /** Log a significant event (persisted to Supabase). */
  logEvent(npcId: string, event: string): void {
    const s = this.get(npcId);
    s.eventLog.push({ event, ts: Date.now() });
    if (s.eventLog.length > MAX_EVENT_LOG) {
      s.eventLog = s.eventLog.slice(-MAX_EVENT_LOG);
    }
    s.dirty = true;
  }

  /** Record a trade outcome. */
  recordTrade(npcId: string, record: TradeRecord): void {
    const s = this.get(npcId);
    s.tradeHistory.push(record);
    if (s.tradeHistory.length > MAX_TRADE_HISTORY) {
      s.tradeHistory = s.tradeHistory.slice(-MAX_TRADE_HISTORY);
    }
    s.dirty = true;
  }

  /** Update reputation for a specific player. */
  updateReputation(npcId: string, playerId: string, delta: number): void {
    const s = this.get(npcId);
    let entry = s.reputation.find((r) => r.playerId === playerId);
    if (!entry) {
      entry = { playerId, score: 0, lastUpdated: Date.now() };
      s.reputation.push(entry);
    }
    entry.score = Math.max(-100, Math.min(100, entry.score + delta));
    entry.lastUpdated = Date.now();
    s.dirty = true;
  }

  /** Set current goal. */
  setGoal(npcId: string, goal: string): void {
    const s = this.get(npcId);
    s.currentGoal = goal;
    s.dirty = true;
  }

  /** Check cooldown. Returns true if action is allowed. */
  checkCooldown(npcId: string, action: string, cooldownMs: number): boolean {
    const s = this.get(npcId);
    const now = Date.now();
    const last = s.cooldowns[action] ?? 0;
    if (now - last < cooldownMs) return false;
    s.cooldowns[action] = now;
    return true;
  }

  /** Return all dirty entries for persistence flush. */
  getDirtyEntries(): NPCMemoryState[] {
    const result: NPCMemoryState[] = [];
    for (const s of this.cache.values()) {
      if (s.dirty) result.push(s);
    }
    return result;
  }

  /** Mark an entry as saved. */
  markSaved(npcId: string): void {
    const s = this.cache.get(npcId);
    if (s) {
      s.dirty = false;
      s.lastSaved = Date.now();
    }
  }

  /** Get all NPC IDs in cache. */
  allIds(): string[] {
    return Array.from(this.cache.keys());
  }
}
