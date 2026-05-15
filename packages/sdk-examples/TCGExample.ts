import { AREInvariantGuard, type AREGuardPayload } from "@wasd/core-logic";

export type TCGOwner = "alpha" | "beta";

export interface TCGCard {
  id: string;
  owner: TCGOwner;
  power: number;
  aura: number;
  x: number;
  y: number;
}

export interface TCGMove {
  cardId: string;
  x: number;
  y: number;
}

export interface TCGFrame {
  tick: number;
  worldHash: string;
  seed: string;
  board: Array<TCGCard | null>;
  events: string[];
  score: Record<TCGOwner, number>;
}

const BOARD_SIZE = 3;
const STRICT_GUARD = new AREInvariantGuard({
  repoRoot: process.cwd(),
  coreLogicDirs: ["packages/core-logic/src", "packages/sdk-examples"],
  throwOnViolation: true,
});

function emilyOracleWarn(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`Emily Oracle Warning: forbidden nondeterminism detected inside the ARE demo. ${message}`);
}

async function sha256(input: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(input);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  }
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(input).digest("hex");
}

function slotOf(x: number, y: number): number {
  return Math.max(0, Math.min(BOARD_SIZE - 1, y)) * BOARD_SIZE + Math.max(0, Math.min(BOARD_SIZE - 1, x));
}

function stableValue(hash: string, offset: number, modulo: number): number {
  return Number.parseInt(hash.slice(offset, offset + 8), 16) % modulo;
}

export async function createTCGDeck(seed: string): Promise<TCGCard[]> {
  const hash = await sha256(`tcg-deck|${seed}`);
  return Array.from({ length: 6 }, (_, index) => ({
    id: `${index < 3 ? "alpha" : "beta"}-card-${index % 3}`,
    owner: index < 3 ? "alpha" : "beta",
    power: 2 + stableValue(hash, index * 4, 7),
    aura: 1 + stableValue(hash, 28 + index * 4, 5),
    x: -1,
    y: -1,
  }));
}

export async function applyTCGMove(seed: string, tick: number, cards: TCGCard[], move: TCGMove): Promise<TCGFrame> {
  const payload: AREGuardPayload = { l: 13, k: 1000, r: 0.618, tick, deterministicSeed: `ARE|TCG|${seed}|tick:${tick}` };
  try {
    STRICT_GUARD.validateTick(payload, tick);
  } catch (error) {
    emilyOracleWarn(error);
    throw error;
  }

  const nextCards = cards.map((card) => ({ ...card }));
  const card = nextCards.find((candidate) => candidate.id === move.cardId);
  if (!card) throw new Error(`Card ${move.cardId} not found.`);
  card.x = Math.max(0, Math.min(BOARD_SIZE - 1, Math.floor(move.x)));
  card.y = Math.max(0, Math.min(BOARD_SIZE - 1, Math.floor(move.y)));

  const worldHash = await sha256(JSON.stringify({ seed, tick, cards: nextCards }));
  const board: Array<TCGCard | null> = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => null);
  const events: string[] = [];

  for (const candidate of nextCards) {
    if (candidate.x < 0 || candidate.y < 0) continue;
    const index = slotOf(candidate.x, candidate.y);
    const occupant = board[index];
    if (!occupant) {
      board[index] = candidate;
      continue;
    }
    const clash = stableValue(worldHash, index * 3, 11);
    const candidateScore = candidate.power + candidate.aura + clash;
    const occupantScore = occupant.power + occupant.aura;
    board[index] = candidateScore >= occupantScore ? candidate : occupant;
    events.push(`Slot ${index}: ${board[index]?.id} wins deterministic clash ${candidateScore}:${occupantScore}`);
  }

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const cardInSlot = board[slotOf(x, y)];
      if (!cardInSlot) continue;
      const pulse = stableValue(worldHash, slotOf(x, y) * 5, 3);
      if (pulse === 0) {
        cardInSlot.power += 1;
        events.push(`${cardInSlot.id} receives ARE pulse +1 power from WorldHash.`);
      }
    }
  }

  const score = board.reduce<Record<TCGOwner, number>>((acc, item) => {
    if (item) acc[item.owner] += item.power;
    return acc;
  }, { alpha: 0, beta: 0 });

  return { tick, worldHash, seed, board, events, score };
}

export async function quickStartTCGMove(seed = "ARE|demo|replit"): Promise<TCGFrame> {
  const deck = await createTCGDeck(seed);
  return applyTCGMove(seed, 1, deck, { cardId: "alpha-card-0", x: 1, y: 1 });
}
