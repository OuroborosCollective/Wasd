import { worldTickAdapter } from "../../core/are/WorldTickThinShellAdapter.js";
import {
  CombatTickSystem,
  registerCombatSystem,
  type CombatAttackReceipt,
} from "../../core/are/CombatTickSystem.js";
import { tickSystemRegistry } from "../../core/are/TickSystemRegistry.js";
import { canonicalIntentIntake } from "../../intents/CanonicalIntentIntake.js";
import {
  canonicalizeClientIntent,
  chunkKeyFromWorldPosition,
} from "../../intents/ServerCanonicalIntent.js";
import { CombatService } from "../../modules/combat/CombatService.js";
import { CombatSystem } from "../../modules/combat/CombatSystem.js";

// Existing runtime player movement defaults to 5 world units per authoritative
// tick. Until authored combat-range data exists, melee reach is deliberately
// tied to that already-live world quantum rather than a new hidden balance knob.
const MELEE_RANGE_WORLD_UNITS = 5;

let combatTickRuntime: CombatTickSystem | null = null;

function safeTargetId(value: unknown): string {
  if (typeof value !== "string") throw new Error("combat_target_id_required");
  const targetId = value.trim();
  if (!/^[a-zA-Z0-9:_-]{1,96}$/.test(targetId)) throw new Error("combat_target_id_invalid");
  return targetId;
}

function safeRequestId(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error("combat_request_id_invalid");
  const requestId = value.trim();
  if (!/^[a-zA-Z0-9:_./-]{1,160}$/.test(requestId)) throw new Error("combat_request_id_invalid");
  return requestId;
}

function finitePlayerPosition(player: any): { x: number; y: number } {
  const x = Number(player?.position?.x);
  const y = Number(player?.position?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("combat_attacker_position_unavailable");
  return { x, y };
}

export function ensureGenkitCombatTickRuntime(): CombatTickSystem {
  if (combatTickRuntime) return combatTickRuntime;

  const existing = tickSystemRegistry.get("combat");
  if (existing) {
    if (!(existing instanceof CombatTickSystem)) {
      throw new Error("combat_tick_system_name_collision");
    }
    combatTickRuntime = existing;
  } else {
    combatTickRuntime = registerCombatSystem(new CombatSystem(), new CombatService());
  }

  combatTickRuntime.setTickProvider(() => worldTickAdapter.tickCount);
  combatTickRuntime.setPlayerProvider((playerId) => worldTickAdapter.playerSystem.getPlayer(playerId));
  combatTickRuntime.setNpcProvider((npcId) => worldTickAdapter.npcSystem.getNPC(npcId));
  return combatTickRuntime;
}

async function waitForCombatReceipt(intentHash: string): Promise<CombatAttackReceipt | null> {
  const runtime = ensureGenkitCombatTickRuntime();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const receipt = runtime.getAttackReceipt(intentHash);
    if (receipt) return receipt;
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  return runtime.getAttackReceipt(intentHash);
}

export async function executeGenkitCombatAttack(input: {
  readonly playerId: string;
  readonly sequence: number;
  readonly payload: Readonly<Record<string, unknown>>;
}) {
  const runtime = ensureGenkitCombatTickRuntime();
  const player = worldTickAdapter.playerSystem.getPlayer(input.playerId);
  if (!player) throw new Error("runtime_player_not_present");

  const targetId = safeTargetId(input.payload.targetId);
  const target = worldTickAdapter.npcSystem.getNPC(targetId);
  if (!target) throw new Error("combat_target_not_found");

  const acceptedAtTick = worldTickAdapter.tickCount;
  const attackerPosition = finitePlayerPosition(player);
  const canonicalIntent = canonicalizeClientIntent<"attack">(
    {
      action: "attack",
      requestId: safeRequestId(input.payload.requestId),
      payload: {
        targetId,
        ...(typeof input.payload.abilityId === "string" && input.payload.abilityId.trim()
          ? { abilityId: input.payload.abilityId.trim() }
          : {}),
      },
    },
    {
      actorId: input.playerId,
      tickId: acceptedAtTick,
      logicalIndex: acceptedAtTick,
      receivedOrder: input.sequence,
      chunkKey: chunkKeyFromWorldPosition(attackerPosition),
    },
  );

  const queued = runtime.enqueueAttack({
    intentHash: canonicalIntent.intentHash,
    attackerId: canonicalIntent.actorId,
    targetId: canonicalIntent.payload.targetId,
    acceptedAtTick,
    maxRange: MELEE_RANGE_WORLD_UNITS,
  });
  if (!queued) throw new Error("combat_attack_intent_rejected");

  // Intake records the server-canonical request only after the authoritative
  // combat tick accepted it into its idempotent queue.
  canonicalIntentIntake.record(canonicalIntent);

  const receipt = await waitForCombatReceipt(canonicalIntent.intentHash);
  if (!receipt) {
    return Object.freeze({
      accepted: true,
      effectVerified: false,
      verification: "combat_intent_queued_but_tick_receipt_not_observed",
      authority: "tick_system_registry:combat",
      canonicalIntent,
      combatReceipt: null,
      meleeRangeWorldUnits: MELEE_RANGE_WORLD_UNITS,
    });
  }

  return Object.freeze({
    accepted: true,
    effectVerified: receipt.applied,
    verification: receipt.applied
      ? "combat_tick_receipt_applied"
      : `combat_tick_receipt_rejected:${receipt.reason ?? "unknown"}`,
    authority: "tick_system_registry:combat",
    canonicalIntent,
    combatReceipt: receipt,
    meleeRangeWorldUnits: MELEE_RANGE_WORLD_UNITS,
  });
}

export function getGenkitCombatRuntimeStatus() {
  const runtime = ensureGenkitCombatTickRuntime();
  const snapshot = runtime.getLastTickSnapshot();
  return Object.freeze({
    available: tickSystemRegistry.get("combat") === runtime,
    authority: "WorldTickThinShell -> TickSystemRegistry -> CombatTickSystem",
    meleeRangeWorldUnits: MELEE_RANGE_WORLD_UNITS,
    pendingAttacks: runtime.getPendingAttackCount(),
    lastTick: snapshot.tick,
    lastProcessedAttackIntentHashes: snapshot.lastProcessedAttackIntentHashes,
  });
}
