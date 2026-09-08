export type EpochId = "awakening" | "strife" | "synthesis" | "ascension";

export interface EpochProgressInput {
  seed: string;
  worldHash: string;
  currentEpoch: EpochId;
  completedDestinyQuests: number;
  globalQuorum: number;
  heroicPeers?: HeroicPeer[];
  sectors: EpochSectorState[];
  tick: number;
}

export interface HeroicPeer {
  peerId: string;
  role: string;
  score: number;
}

export interface EpochSectorState {
  sectorId: string;
  corruption: number;
  scarcity: number;
  synthesis: number;
  threat: number;
}

export interface EpochGlobalModifiers {
  lootBias: number;
  blueprintBias: number;
  npcDifficulty: number;
  healingPriority: number;
  synthesisYield: number;
}

export interface EpochDefinition {
  id: EpochId;
  label: string;
  minDestinyQuests: number;
  minGlobalQuorum: number;
  modifiers: EpochGlobalModifiers;
  unlockedBlueprints: string[];
}

export interface EpochShiftPayload {
  shifted: boolean;
  previousEpoch: EpochId;
  nextEpoch: EpochId;
  epochHash: string;
  resetHash: string;
  modifiers: EpochGlobalModifiers;
  archivedHeroes: HeroicPeer[];
  sectors: EpochSectorState[];
  emilyChronicle: string;
}

export const SOVEREIGN_EPOCHS: EpochDefinition[] = [
  {
    id: "awakening",
    label: "Age of Awakening",
    minDestinyQuests: 0,
    minGlobalQuorum: 0,
    modifiers: { lootBias: 1, blueprintBias: 1, npcDifficulty: 1, healingPriority: 1, synthesisYield: 1 },
    unlockedBlueprints: ["echo_blade"],
  },
  {
    id: "strife",
    label: "Age of Strife",
    minDestinyQuests: 12,
    minGlobalQuorum: 0.42,
    modifiers: { lootBias: 1.08, blueprintBias: 1.04, npcDifficulty: 1.2, healingPriority: 1.1, synthesisYield: 0.96 },
    unlockedBlueprints: ["echo_blade", "warden_aegis", "scarcity_lance"],
  },
  {
    id: "synthesis",
    label: "Age of Synthesis",
    minDestinyQuests: 34,
    minGlobalQuorum: 0.64,
    modifiers: { lootBias: 1.14, blueprintBias: 1.12, npcDifficulty: 1.32, healingPriority: 1.24, synthesisYield: 1.22 },
    unlockedBlueprints: ["sovereign_circuit", "ouroboros_anvil_core", "healer_matrix"],
  },
  {
    id: "ascension",
    label: "Age of Ascension",
    minDestinyQuests: 89,
    minGlobalQuorum: 0.81,
    modifiers: { lootBias: 1.22, blueprintBias: 1.2, npcDifficulty: 1.55, healingPriority: 1.42, synthesisYield: 1.36 },
    unlockedBlueprints: ["epoch_crown", "white_gold_chronicle", "collective_starforge"],
  },
];

function hashText(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

function definition(id: EpochId): EpochDefinition {
  return SOVEREIGN_EPOCHS.find((epoch) => epoch.id === id) ?? SOVEREIGN_EPOCHS[0];
}

function nextDefinition(current: EpochId): EpochDefinition {
  const index = Math.max(0, SOVEREIGN_EPOCHS.findIndex((epoch) => epoch.id === current));
  return SOVEREIGN_EPOCHS[Math.min(SOVEREIGN_EPOCHS.length - 1, index + 1)];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function resetSector(sector: EpochSectorState, epoch: EpochDefinition, salt: string): EpochSectorState {
  const h = parseInt(hashText(`${salt}|${sector.sectorId}|${epoch.id}`).slice(0, 8), 16) / 0xffffffff;
  return {
    sectorId: sector.sectorId,
    corruption: Number(clamp01(sector.corruption * 0.24 + h * 0.09).toFixed(4)),
    scarcity: Number(clamp01(sector.scarcity * 0.34 + (1 - h) * 0.12).toFixed(4)),
    synthesis: Number(clamp01(epoch.modifiers.synthesisYield / 2.4 + h * 0.18).toFixed(4)),
    threat: Number(clamp01(sector.threat * epoch.modifiers.npcDifficulty * 0.28 + h * 0.11).toFixed(4)),
  };
}

function archiveHeroes(peers: HeroicPeer[] = []): HeroicPeer[] {
  // Bolt: Optimized tie-breaker peer ID sorting using fast direct relational comparison instead of slow localeCompare
  return [...peers].sort((a, b) => b.score - a.score || (a.peerId < b.peerId ? -1 : a.peerId > b.peerId ? 1 : 0)).slice(0, 7);
}

export function evaluateEpochShift(input: EpochProgressInput): EpochShiftPayload {
  const current = definition(input.currentEpoch);
  const next = nextDefinition(input.currentEpoch);
  const canShift = next.id !== current.id && input.completedDestinyQuests >= next.minDestinyQuests && input.globalQuorum >= next.minGlobalQuorum;
  const selected = canShift ? next : current;
  const epochHash = hashText(`${input.seed}|${input.worldHash}|${current.id}|${selected.id}|${input.completedDestinyQuests}|${input.globalQuorum}|${input.tick}`);
  const resetHash = hashText(`${epochHash}|reset|${input.sectors.map((sector) => sector.sectorId).join(",")}`);
  const sectors = canShift ? input.sectors.map((sector) => resetSector(sector, selected, resetHash)) : input.sectors;
  const archivedHeroes = canShift ? archiveHeroes(input.heroicPeers) : [];
  const label = selected.label;

  return {
    shifted: canShift,
    previousEpoch: current.id,
    nextEpoch: selected.id,
    epochHash,
    resetHash,
    modifiers: selected.modifiers,
    archivedHeroes,
    sectors,
    emilyChronicle: canShift
      ? `Emily Chronistin: Das ${label} beginnt. Die Kausalität wurde in Weiß/Gold neu gefaltet. ${archivedHeroes.length} Peers wurden archiviert.`
      : `Emily Chronistin: ${current.label} bleibt stabil. Destiny ${input.completedDestinyQuests}/${next.minDestinyQuests}, Quorum ${input.globalQuorum.toFixed(2)}/${next.minGlobalQuorum.toFixed(2)}.`,
  };
}

export function getEpochDefinition(id: EpochId): EpochDefinition {
  return definition(id);
}

export function listEpochDefinitions(): EpochDefinition[] {
  return [...SOVEREIGN_EPOCHS];
}
