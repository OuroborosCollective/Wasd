import { canonicalIntentIntake } from "../../intents/CanonicalIntentIntake.js";
import { canonicalizeActorMoveIntent } from "../../intents/ServerCanonicalIntent.js";
import { worldTickAdapter } from "../../core/are/WorldTickThinShellAdapter.js";

export const EXECUTABLE_GENKIT_GAMEPLAY_ACTIONS = [
  "move",
  "gather",
  "quest_talk",
  "quest_accept",
  "quest_complete",
  "craft",
  "equipment_equip",
  "equipment_unequip",
  "economy_sell_resource",
  "economy_sell_all_resources",
  "economy_buy_resource",
  "economy_complete_camp_quest",
  "economy_trade_transfer",
] as const;

export type GenkitGameplayAction = (typeof EXECUTABLE_GENKIT_GAMEPLAY_ACTIONS)[number];

export interface GenkitGameplayOperatorRequest {
  readonly sessionId: string;
  readonly sequence: number;
  readonly playerId: string;
  readonly action: GenkitGameplayAction;
  readonly payload?: Readonly<Record<string, unknown>>;
  readonly expectedRevisionHash?: string;
}

type RouteAction = Exclude<GenkitGameplayAction, "move">;

type RouteDefinition = Readonly<{
  method: "POST";
  path: string;
  authority: "existing_server_route";
  canonicalIntentExpected: true;
}>;

const ROUTE_ACTIONS: Readonly<Record<RouteAction, RouteDefinition>> = Object.freeze({
  gather: Object.freeze({ method: "POST", path: "/api/resource/gather", authority: "existing_server_route", canonicalIntentExpected: true }),
  quest_talk: Object.freeze({ method: "POST", path: "/api/npc/talk", authority: "existing_server_route", canonicalIntentExpected: true }),
  quest_accept: Object.freeze({ method: "POST", path: "/api/quests/accept", authority: "existing_server_route", canonicalIntentExpected: true }),
  quest_complete: Object.freeze({ method: "POST", path: "/api/quests/complete", authority: "existing_server_route", canonicalIntentExpected: true }),
  craft: Object.freeze({ method: "POST", path: "/api/crafting/craft", authority: "existing_server_route", canonicalIntentExpected: true }),
  equipment_equip: Object.freeze({ method: "POST", path: "/api/equipment/equip", authority: "existing_server_route", canonicalIntentExpected: true }),
  equipment_unequip: Object.freeze({ method: "POST", path: "/api/equipment/unequip", authority: "existing_server_route", canonicalIntentExpected: true }),
  economy_sell_resource: Object.freeze({ method: "POST", path: "/api/economy/sell-resource", authority: "existing_server_route", canonicalIntentExpected: true }),
  economy_sell_all_resources: Object.freeze({ method: "POST", path: "/api/economy/sell-all-resources", authority: "existing_server_route", canonicalIntentExpected: true }),
  economy_buy_resource: Object.freeze({ method: "POST", path: "/api/economy/buy-resource", authority: "existing_server_route", canonicalIntentExpected: true }),
  economy_complete_camp_quest: Object.freeze({ method: "POST", path: "/api/economy/complete-camp-quest", authority: "existing_server_route", canonicalIntentExpected: true }),
  economy_trade_transfer: Object.freeze({ method: "POST", path: "/api/economy/trade-transfer", authority: "existing_server_route", canonicalIntentExpected: true }),
});

const BLOCKED_AUTHORITY_CAPABILITIES = Object.freeze([
  Object.freeze({ capability: "combat", reason: "CombatTickSystem exists but is not registered on the live WorldTickAdapter; no Genkit combat success may be claimed until that canonical tick path is wired." }),
  Object.freeze({ capability: "direct_inventory_mutation", reason: "The public inventory API is read-only. Inventory mutation remains available only through canonical gather, crafting, equipment and economy operations until a dedicated canonical inventory command path exists." }),
  Object.freeze({ capability: "guild_governance", reason: "GuildRuntimePort is currently unavailable on WorldTickAdapter." }),
]);

const lastSequenceBySession = new Map<string, number>();

function safeIdentifier(value: unknown, field: string, maxLength = 160): string {
  if (typeof value !== "string") throw new Error(`${field}_required`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || !/^[a-zA-Z0-9:_./-]+$/.test(trimmed)) {
    throw new Error(`${field}_invalid`);
  }
  return trimmed;
}

function safePlayerId(value: unknown): string {
  if (typeof value !== "string") throw new Error("player_id_required");
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9._:-]{1,96}$/.test(trimmed)) throw new Error("player_id_invalid");
  return trimmed;
}

function normalizePayload(value: unknown): Readonly<Record<string, unknown>> {
  if (value === undefined) return Object.freeze({});
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("payload_must_be_object");
  const serialized = JSON.stringify(value);
  if (serialized.length > 64_000) throw new Error("payload_too_large");
  return Object.freeze({ ...(value as Record<string, unknown>) });
}

function claimSequence(sessionId: string, playerId: string, sequence: number): { key: string; previous: number | undefined } {
  if (!Number.isSafeInteger(sequence) || sequence <= 0) throw new Error("sequence_must_be_positive_safe_integer");
  const key = `${sessionId}:${playerId}`;
  const previous = lastSequenceBySession.get(key);
  if (previous !== undefined && sequence <= previous) throw new Error("sequence_must_strictly_increase");
  lastSequenceBySession.set(key, sequence);
  return { key, previous };
}

function rollbackSequence(claim: { key: string; previous: number | undefined }, sequence: number): void {
  if (lastSequenceBySession.get(claim.key) !== sequence) return;
  if (claim.previous === undefined) lastSequenceBySession.delete(claim.key);
  else lastSequenceBySession.set(claim.key, claim.previous);
}

function operatorHeaders(playerId: string, includeJson: boolean): Record<string, string> {
  const token = process.env.MCP_ADMIN_TOKEN?.trim();
  if (!token) throw new Error("genkit_operator_requires_mcp_admin_token");
  return {
    accept: "application/json",
    "x-areloria-operator-player-id": playerId,
    "x-areloria-operator-token": token,
    ...(includeJson ? { "content-type": "application/json" } : {}),
  };
}

function loopbackUrl(path: string): string {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isSafeInteger(port) || port <= 0 || port > 65535) throw new Error("invalid_server_port");
  return `http://127.0.0.1:${port}${path}`;
}

async function loopbackJson(
  method: "GET" | "POST",
  path: string,
  playerId: string,
  body?: Readonly<Record<string, unknown>>,
): Promise<{ readonly status: number; readonly ok: boolean; readonly body: unknown }> {
  const response = await fetch(loopbackUrl(path), {
    method,
    headers: operatorHeaders(playerId, body !== undefined),
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // Keep raw text as evidence. Never synthesize a successful JSON body.
  }
  return Object.freeze({ status: response.status, ok: response.ok, body: parsed });
}

function responseClaimsOk(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return (value as Record<string, unknown>).ok === true;
}

function responseHasCanonicalIntent(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const intent = (value as Record<string, unknown>).canonicalIntent;
  if (!intent || typeof intent !== "object") return false;
  const hash = (intent as Record<string, unknown>).intentHash;
  return typeof hash === "string" && /^[a-f0-9]{64}$/i.test(hash);
}

type SnapshotEvidence = Readonly<{
  playerId: string;
  serverTick: number;
  revisionHash: string;
  revisionSequence: number;
  lastMutationHash: string | null;
  sourceEvidence: Readonly<Record<string, string>>;
}>;

function parseSnapshotEvidence(value: unknown): SnapshotEvidence {
  if (!value || typeof value !== "object") throw new Error("gameplay_snapshot_invalid");
  const record = value as Record<string, unknown>;
  if (record.ok !== true) throw new Error("gameplay_snapshot_not_ok");
  const playerId = safePlayerId(record.playerId);
  const serverTick = Number(record.serverTick);
  const revisionSequence = Number(record.revisionSequence);
  const revisionHash = typeof record.revisionHash === "string" ? record.revisionHash : "";
  const lastMutationHash = typeof record.lastMutationHash === "string" ? record.lastMutationHash : null;
  if (!Number.isSafeInteger(serverTick) || serverTick < 0) throw new Error("gameplay_snapshot_tick_invalid");
  if (!Number.isSafeInteger(revisionSequence)) throw new Error("gameplay_snapshot_revision_sequence_invalid");
  if (!/^[a-f0-9]{64}$/i.test(revisionHash)) throw new Error("gameplay_snapshot_revision_hash_invalid");

  const sourceEvidence: Record<string, string> = {};
  const rawEvidence = record.sourceEvidence;
  if (!rawEvidence || typeof rawEvidence !== "object") throw new Error("gameplay_snapshot_source_evidence_missing");
  for (const [name, evidence] of Object.entries(rawEvidence as Record<string, unknown>)) {
    if (!evidence || typeof evidence !== "object") continue;
    const hash = (evidence as Record<string, unknown>).hash;
    if (typeof hash === "string" && /^[a-f0-9]{64}$/i.test(hash)) sourceEvidence[name] = hash.toLowerCase();
  }
  if (Object.keys(sourceEvidence).length === 0) throw new Error("gameplay_snapshot_source_evidence_empty");

  return Object.freeze({
    playerId,
    serverTick,
    revisionHash: revisionHash.toLowerCase(),
    revisionSequence,
    lastMutationHash,
    sourceEvidence: Object.freeze(sourceEvidence),
  });
}

function changedEvidenceModules(before: SnapshotEvidence, after: SnapshotEvidence): string[] {
  const names = new Set([...Object.keys(before.sourceEvidence), ...Object.keys(after.sourceEvidence)]);
  return [...names]
    .filter((name) => before.sourceEvidence[name] !== after.sourceEvidence[name])
    .sort();
}

export async function readGenkitGameplaySnapshot(playerIdInput: string): Promise<SnapshotEvidence> {
  const playerId = safePlayerId(playerIdInput);
  const response = await loopbackJson("GET", "/api/gameplay/snapshot", playerId);
  if (!response.ok) throw new Error(`gameplay_snapshot_http_${response.status}`);
  const parsed = parseSnapshotEvidence(response.body);
  if (parsed.playerId !== playerId) throw new Error("gameplay_snapshot_actor_mismatch");
  return parsed;
}

function normalizeMove(payload: Readonly<Record<string, unknown>>): { dx: number; dy: number; requestId?: string } {
  let dx = Number(payload.dx);
  let dy = Number(payload.dy);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) throw new Error("move_delta_must_be_finite");
  dx = Math.max(-1, Math.min(1, dx));
  dy = Math.max(-1, Math.min(1, dy));
  const magnitudeSquared = dx * dx + dy * dy;
  if (magnitudeSquared <= 0) throw new Error("move_delta_must_be_non_zero");
  if (magnitudeSquared > 1) {
    const magnitude = Math.sqrt(magnitudeSquared);
    dx /= magnitude;
    dy /= magnitude;
  }
  const requestId = payload.requestId === undefined ? undefined : safeIdentifier(payload.requestId, "request_id");
  return { dx, dy, requestId };
}

async function waitForMoveReadback(
  playerId: string,
  acceptedAtTick: number,
  expected: { x: number; y: number },
): Promise<{ tick: number; position: { x: number; y: number }; verified: boolean }> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const player = worldTickAdapter.playerSystem.getPlayer(playerId);
    const tick = worldTickAdapter.tickCount;
    const x = Number(player?.position?.x);
    const y = Number(player?.position?.y);
    const position = { x, y };
    const verified =
      tick > acceptedAtTick &&
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      Math.abs(x - expected.x) <= 0.000001 &&
      Math.abs(y - expected.y) <= 0.000001;
    if (verified) return { tick, position, verified: true };
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  const player = worldTickAdapter.playerSystem.getPlayer(playerId);
  return {
    tick: worldTickAdapter.tickCount,
    position: { x: Number(player?.position?.x), y: Number(player?.position?.y) },
    verified: false,
  };
}

async function executeMove(
  playerId: string,
  sequence: number,
  payload: Readonly<Record<string, unknown>>,
) {
  const player = worldTickAdapter.playerSystem.getPlayer(playerId);
  if (!player) throw new Error("runtime_player_not_present");
  const before = { x: Number(player.position?.x), y: Number(player.position?.y) };
  if (!Number.isFinite(before.x) || !Number.isFinite(before.y)) throw new Error("runtime_player_position_unavailable");

  const move = normalizeMove(payload);
  const acceptedAtTick = worldTickAdapter.tickCount;
  const speed = Number((worldTickAdapter as unknown as { client2DMoveSpeed?: number }).client2DMoveSpeed ?? 5);
  const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 5;
  const expected = {
    x: before.x + move.dx * safeSpeed,
    y: before.y + move.dy * safeSpeed,
  };
  const canonicalIntent = canonicalizeActorMoveIntent({
    actorId: playerId,
    fromPosition: before,
    delta: { dx: move.dx * safeSpeed, dy: move.dy * safeSpeed },
    tickId: acceptedAtTick,
    logicalIndex: acceptedAtTick,
    receivedOrder: sequence,
    requestId: move.requestId,
  });

  const enqueued = worldTickAdapter.playerSystem.enqueueMoveIntent({
    playerId,
    dx: move.dx,
    dy: move.dy,
    sequenceId: sequence,
    acceptedAtTick,
  });
  if (!enqueued) throw new Error("move_intent_rejected");
  canonicalIntentIntake.record(canonicalIntent);

  const readback = await waitForMoveReadback(playerId, acceptedAtTick, expected);
  return Object.freeze({
    accepted: true,
    effectVerified: readback.verified,
    verification: readback.verified ? "tick_position_matches_expected" : "move_enqueued_but_tick_position_not_observed",
    authority: "worldtick_runtime_player_system",
    canonicalIntent,
    before: Object.freeze({ tick: acceptedAtTick, position: Object.freeze(before), worldHash: worldTickAdapter.getWorldHashSnapshot()?.worldHash ?? null }),
    after: Object.freeze({ tick: readback.tick, position: Object.freeze(readback.position), worldHash: worldTickAdapter.getWorldHashSnapshot()?.worldHash ?? null }),
  });
}

export function getGenkitGameplayCapabilities() {
  const runtimePorts = worldTickAdapter.getRuntimePortDiagnostics();
  return Object.freeze({
    schemaVersion: "areloria.genkit-gameplay-capabilities.v1",
    operatorAuthConfigured: Boolean(process.env.MCP_ADMIN_TOKEN?.trim()),
    executionBoundary: "Genkit chooses/requests actions; existing server authority creates truth and readback.",
    sequencePolicy: "strictly_increasing_per_session_and_player",
    executable: Object.freeze([
      Object.freeze({ action: "move", authority: "WorldTick RuntimePlayerSystem + ServerCanonicalIntent + CanonicalIntentIntake" }),
      ...Object.entries(ROUTE_ACTIONS).map(([action, definition]) => Object.freeze({ action, ...definition })),
    ]),
    blocked: BLOCKED_AUTHORITY_CAPABILITIES,
    runtimePorts: Object.freeze(runtimePorts),
  });
}

export async function executeGenkitGameplayAction(input: GenkitGameplayOperatorRequest) {
  const sessionId = safeIdentifier(input.sessionId, "session_id", 96);
  const playerId = safePlayerId(input.playerId);
  const payload = normalizePayload(input.payload);
  if (!(EXECUTABLE_GENKIT_GAMEPLAY_ACTIONS as readonly string[]).includes(input.action)) {
    throw new Error("gameplay_action_not_allowed");
  }

  const claim = claimSequence(sessionId, playerId, input.sequence);
  let mutationAccepted = false;
  try {
    if (input.action === "move") {
      const result = await executeMove(playerId, input.sequence, payload);
      mutationAccepted = result.accepted;
      return Object.freeze({
        schemaVersion: "areloria.genkit-gameplay-execution.v1",
        sessionId,
        sequence: input.sequence,
        playerId,
        action: input.action,
        ...result,
      });
    }

    const before = await readGenkitGameplaySnapshot(playerId);
    if (input.expectedRevisionHash) {
      const expected = input.expectedRevisionHash.trim().toLowerCase();
      if (!/^[a-f0-9]{64}$/.test(expected)) throw new Error("expected_revision_hash_invalid");
      if (expected !== before.revisionHash) throw new Error("expected_revision_hash_mismatch");
    }

    const route = ROUTE_ACTIONS[input.action];
    const response = await loopbackJson(route.method, route.path, playerId, payload);
    const accepted = response.ok && responseClaimsOk(response.body);
    const canonicalIntentPresent = responseHasCanonicalIntent(response.body);
    mutationAccepted = accepted;
    if (!accepted) {
      return Object.freeze({
        schemaVersion: "areloria.genkit-gameplay-execution.v1",
        sessionId,
        sequence: input.sequence,
        playerId,
        action: input.action,
        accepted: false,
        effectVerified: false,
        authority: route.authority,
        route: route.path,
        httpStatus: response.status,
        canonicalIntentPresent,
        response: response.body,
        before,
      });
    }
    if (route.canonicalIntentExpected && !canonicalIntentPresent) {
      throw new Error("authoritative_route_missing_canonical_intent_receipt");
    }

    const after = await readGenkitGameplaySnapshot(playerId);
    const changedModules = changedEvidenceModules(before, after);
    const mutationHistoryAdvanced =
      after.revisionSequence > before.revisionSequence ||
      after.lastMutationHash !== before.lastMutationHash;
    const effectVerified = changedModules.length > 0 || mutationHistoryAdvanced;

    return Object.freeze({
      schemaVersion: "areloria.genkit-gameplay-execution.v1",
      sessionId,
      sequence: input.sequence,
      playerId,
      action: input.action,
      accepted: true,
      effectVerified,
      verification: effectVerified ? "authoritative_followup_snapshot_changed" : "route_accepted_but_effect_readback_unchanged",
      authority: route.authority,
      route: route.path,
      httpStatus: response.status,
      canonicalIntentPresent,
      response: response.body,
      readback: Object.freeze({
        before,
        after,
        changedModules: Object.freeze(changedModules),
        mutationHistoryAdvanced,
      }),
    });
  } finally {
    if (!mutationAccepted) rollbackSequence(claim, input.sequence);
  }
}

/** Test/maintenance hook. Never part of gameplay truth. */
export function resetGenkitGameplayOperatorSequences(): void {
  lastSequenceBySession.clear();
}
