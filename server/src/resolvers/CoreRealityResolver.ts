/**
 * CoreRealityResolver.ts
 *
 * ARELORIA CORE REALITY RESOLVER
 *
 * Purpose:
 * - No direct WorldTick truth.
 * - No legacy scheduler truth.
 * - No wall-clock simulation truth.
 * - No old "determinism by naming" logic.
 * - Resolve legacy names into canonical ARE Core structures.
 *
 * Rule:
 * Old names may be accepted only as migration input.
 * They never become canonical output.
 *
 * Manifest:
 * - Kein Snapshot, kein Spiel.
 * - Kein Tick, keine Wahrheit.
 * - Kein Guard, keine Architektur.
 * - Kein /2d Proof, keine Integration.
 */

export type CoreRealityModuleId =
  | "are-core-types"
  | "kappa-core"
  | "state-hash"
  | "deterministic-prng"
  | "are-guard"
  | "tick-system"
  | "tick-system-registry"
  | "world-tick-scheduler"
  | "world-brain-tick-system"
  | "snapshot-composer"
  | "are-replay-buffer"
  | "write-behind-persistence-queue"
  | "unified-chunk-contract"
  | "interest-grid"
  | "observed-chunk-set"
  | "client-2d-snapshot-view"
  | "runtime-manifest"
  | "module-port-contract"
  | "forbidden-runtime-api";

export type CoreRealityResolutionSource =
  | "canonical"
  | "legacy-alias"
  | "forbidden"
  | "fallback";

export type CoreRealitySeverity =
  | "ok"
  | "migration"
  | "blocked";

export interface CoreRealityResolverOptions {
  /**
   * If true, forbidden or unknown values throw.
   * If false, unknown values resolve to fallbackModule.
   */
  readonly strict?: boolean;

  /**
   * Used only when strict=false and the input is unknown.
   */
  readonly fallbackModule?: CoreRealityModuleId;
}

export interface CoreRealityResolution {
  readonly input: string;
  readonly normalized: string;
  readonly moduleId: CoreRealityModuleId;
  readonly source: CoreRealityResolutionSource;
  readonly severity: CoreRealitySeverity;
  readonly canonicalPath: string;
  readonly migrationNote: string;
  readonly forbiddenImports: readonly string[];
  readonly requiredProof: readonly CoreRealityProof[];
}

export type CoreRealityProof =
  | "server-authoritative"
  | "deterministic-tick"
  | "kappa-integer-core"
  | "state-hash"
  | "replay-delta"
  | "snapshot-output"
  | "client-2d-proof"
  | "guard-test";

export class CoreRealityResolverError extends Error {
  public readonly code:
    | "UNKNOWN_CORE_REALITY_MODULE"
    | "FORBIDDEN_CORE_REALITY_MODULE";

  public readonly input: string;
  public readonly normalized: string;
  public readonly allowedModules: readonly CoreRealityModuleId[];

  constructor(params: {
    readonly code:
      | "UNKNOWN_CORE_REALITY_MODULE"
      | "FORBIDDEN_CORE_REALITY_MODULE";
    readonly input: string;
    readonly normalized: string;
    readonly allowedModules: readonly CoreRealityModuleId[];
    readonly message: string;
  }) {
    super(params.message);

    this.name = "CoreRealityResolverError";
    this.code = params.code;
    this.input = params.input;
    this.normalized = params.normalized;
    this.allowedModules = params.allowedModules;
  }
}

interface CoreRealityDefinition {
  readonly moduleId: CoreRealityModuleId;
  readonly canonicalPath: string;
  readonly migrationNote: string;
  readonly forbiddenImports: readonly string[];
  readonly requiredProof: readonly CoreRealityProof[];
}

const CANONICAL_DEFINITIONS: Readonly<Record<CoreRealityModuleId, CoreRealityDefinition>> =
  Object.freeze({
    "are-core-types": {
      moduleId: "are-core-types",
      canonicalPath: "server/src/core/are/types.ts",
      migrationNote:
        "Use branded ARE types for Kappa, TickId, StateHash, ChunkCoord and ChunkKey.",
      forbiddenImports: [],
      requiredProof: [
        "kappa-integer-core",
        "state-hash",
        "guard-test",
      ],
    },

    "kappa-core": {
      moduleId: "kappa-core",
      canonicalPath: "server/src/core/are/Kappa.ts",
      migrationNote:
        "Use fixed-point integer Kappa semantics. Decimal input is boundary-only.",
      forbiddenImports: [],
      requiredProof: [
        "kappa-integer-core",
        "guard-test",
      ],
    },

    "state-hash": {
      moduleId: "state-hash",
      canonicalPath: "server/src/core/are/StateHash.ts",
      migrationNote:
        "State identity must be derived from canonical deterministic payloads.",
      forbiddenImports: [],
      requiredProof: [
        "state-hash",
        "replay-delta",
        "guard-test",
      ],
    },

    "deterministic-prng": {
      moduleId: "deterministic-prng",
      canonicalPath: "server/src/core/are/DeterministicPrng.ts",
      migrationNote:
        "Use seeded deterministic PRNG only. Never Math.random in authoritative logic.",
      forbiddenImports: [
        "Math.random",
        "crypto.randomUUID",
      ],
      requiredProof: [
        "deterministic-tick",
        "guard-test",
      ],
    },

    "are-guard": {
      moduleId: "are-guard",
      canonicalPath: "server/src/core/are/AREGuard.ts",
      migrationNote:
        "Guard validates forbidden runtime APIs, Kappa integrity and integer state.",
      forbiddenImports: [],
      requiredProof: [
        "guard-test",
        "kappa-integer-core",
      ],
    },

    "tick-system": {
      moduleId: "tick-system",
      canonicalPath: "server/src/core/are/TickSystem.ts",
      migrationNote:
        "Every runtime subsystem is isolated behind TickSystem.",
      forbiddenImports: [
        "server/src/core/WorldTick.ts",
      ],
      requiredProof: [
        "server-authoritative",
        "deterministic-tick",
        "guard-test",
      ],
    },

    "tick-system-registry": {
      moduleId: "tick-system-registry",
      canonicalPath: "server/src/core/are/TickSystemRegistry.ts",
      migrationNote:
        "Register ordered deterministic subsystems. No direct scheduler takeover.",
      forbiddenImports: [
        "server/src/core/WorldTick.ts",
      ],
      requiredProof: [
        "deterministic-tick",
        "guard-test",
      ],
    },

    "world-tick-scheduler": {
      moduleId: "world-tick-scheduler",
      canonicalPath: "server/src/core/are/WorldTickScheduler.ts",
      migrationNote:
        "Thin logical scheduler only. It does not own domain logic, I/O, DB or snapshot construction.",
      forbiddenImports: [
        "server/src/core/WorldTick.ts",
        "Date.now",
        "performance.now",
        "setInterval",
        "Math.random",
      ],
      requiredProof: [
        "server-authoritative",
        "deterministic-tick",
        "guard-test",
      ],
    },

    "world-brain-tick-system": {
      moduleId: "world-brain-tick-system",
      canonicalPath: "server/src/core/are/WorldBrainTickSystem.ts",
      migrationNote:
        "World Brain is a TickSystem. It reads canonical state through ports and emits deltas.",
      forbiddenImports: [
        "server/src/core/WorldTick.ts",
        "Date.now",
        "Math.random",
      ],
      requiredProof: [
        "server-authoritative",
        "deterministic-tick",
        "kappa-integer-core",
        "state-hash",
        "replay-delta",
        "snapshot-output",
        "guard-test",
      ],
    },

    "snapshot-composer": {
      moduleId: "snapshot-composer",
      canonicalPath: "server/src/core/are/SnapshotComposer.ts",
      migrationNote:
        "SnapshotComposer is the server truth output path for visible state.",
      forbiddenImports: [
        "client-only-state",
      ],
      requiredProof: [
        "snapshot-output",
        "client-2d-proof",
        "guard-test",
      ],
    },

    "are-replay-buffer": {
      moduleId: "are-replay-buffer",
      canonicalPath: "server/src/core/are/AREReplayBuffer.ts",
      migrationNote:
        "Every state mutation must be reconstructable from tick input and replay delta.",
      forbiddenImports: [
        "Date.now",
        "Math.random",
      ],
      requiredProof: [
        "deterministic-tick",
        "replay-delta",
        "state-hash",
        "guard-test",
      ],
    },

    "write-behind-persistence-queue": {
      moduleId: "write-behind-persistence-queue",
      canonicalPath: "server/src/core/are/LayerPersistenceQueue.ts",
      migrationNote:
        "Persistence is a side-effect queue. It must never block or define simulation truth.",
      forbiddenImports: [
        "server/src/core/WorldTick.ts",
      ],
      requiredProof: [
        "replay-delta",
        "guard-test",
      ],
    },

    "unified-chunk-contract": {
      moduleId: "unified-chunk-contract",
      canonicalPath: "server/src/core/spatial/UnifiedChunkContract.ts",
      migrationNote:
        "Single source for chunk size, simulation radius and broadcast radius.",
      forbiddenImports: [
        "inline chunk radius",
        "local get3x3ChunkKeys",
      ],
      requiredProof: [
        "kappa-integer-core",
        "guard-test",
      ],
    },

    "interest-grid": {
      moduleId: "interest-grid",
      canonicalPath: "server/src/core/spatial/InterestGrid.ts",
      migrationNote:
        "InterestGrid replaces scattered observer/broadcast math.",
      forbiddenImports: [
        "SpatialBroadcastGrid",
        "inline observer radius",
      ],
      requiredProof: [
        "server-authoritative",
        "kappa-integer-core",
        "guard-test",
      ],
    },

    "observed-chunk-set": {
      moduleId: "observed-chunk-set",
      canonicalPath: "server/src/core/spatial/ObservedChunkSet.ts",
      migrationNote:
        "ObservedChunkSet tracks active chunks deterministically.",
      forbiddenImports: [
        "ad-hoc active chunk arrays",
      ],
      requiredProof: [
        "deterministic-tick",
        "guard-test",
      ],
    },

    "client-2d-snapshot-view": {
      moduleId: "client-2d-snapshot-view",
      canonicalPath: "apps/client-2d/src",
      migrationNote:
        "Client is an observer. It renders server snapshots and must not invent authoritative state.",
      forbiddenImports: [
        "server mutation from client",
        "3d required path",
      ],
      requiredProof: [
        "snapshot-output",
        "client-2d-proof",
      ],
    },

    "runtime-manifest": {
      moduleId: "runtime-manifest",
      canonicalPath: "public/runtime-manifest.json",
      migrationNote:
        "Runtime manifest is the bridge for accepted assets and boot-visible resources.",
      forbiddenImports: [
        "raw asset folder scan in runtime",
      ],
      requiredProof: [
        "snapshot-output",
        "client-2d-proof",
        "guard-test",
      ],
    },

    "module-port-contract": {
      moduleId: "module-port-contract",
      canonicalPath: "server/src/core/are",
      migrationNote:
        "New modules read through ports, write deltas, feed replay and snapshot sinks.",
      forbiddenImports: [
        "direct DB from TickSystem",
        "direct filesystem from TickSystem",
        "direct WorldTick import",
      ],
      requiredProof: [
        "server-authoritative",
        "deterministic-tick",
        "replay-delta",
        "snapshot-output",
        "guard-test",
      ],
    },

    "forbidden-runtime-api": {
      moduleId: "forbidden-runtime-api",
      canonicalPath: "not-allowed-in-authoritative-core",
      migrationNote:
        "Forbidden runtime APIs must be moved to adapters or replaced with TickId, seeded PRNG or replay input.",
      forbiddenImports: [
        "Date.now",
        "Math.random",
        "performance.now",
        "setInterval",
        "fetch in TickSystem",
        "direct DB in TickSystem",
      ],
      requiredProof: [
        "guard-test",
      ],
    },
  });

const CANONICAL_MODULES: readonly CoreRealityModuleId[] = Object.freeze(
  Object.keys(CANONICAL_DEFINITIONS) as CoreRealityModuleId[],
);

const CANONICAL_SET: ReadonlySet<string> = new Set(CANONICAL_MODULES);

const LEGACY_ALIASES: Readonly<Record<string, CoreRealityModuleId>> =
  Object.freeze({
    // Old tick names resolve to the new thin scheduler.
    worldtick: "world-tick-scheduler",
    world_tick: "world-tick-scheduler",
    worldtick_ts: "world-tick-scheduler",
    world_tick_ts: "world-tick-scheduler",
    server_src_core_worldtick_ts: "world-tick-scheduler",
    old_worldtick: "world-tick-scheduler",
    legacy_worldtick: "world-tick-scheduler",
    tick_loop: "world-tick-scheduler",
    main_loop: "world-tick-scheduler",
    game_loop: "world-tick-scheduler",

    // Old brain scheduler names resolve to TickSystem brain.
    worldbrainscheduler: "world-brain-tick-system",
    world_brain_scheduler: "world-brain-tick-system",
    brain_scheduler: "world-brain-tick-system",
    world_brain: "world-brain-tick-system",
    worldbrain: "world-brain-tick-system",
    thirteen_layers: "world-brain-tick-system",
    iare_layers: "world-brain-tick-system",
    are_layers: "world-brain-tick-system",

    // Old deterministic wording resolves to explicit primitives.
    deterministic_logic: "module-port-contract",
    determinism: "are-guard",
    deterministic: "are-guard",
    are_logic: "module-port-contract",
    core_reality: "module-port-contract",
    core_reality_alignment: "module-port-contract",

    // Old spatial names.
    chunksystem: "unified-chunk-contract",
    chunk_system: "unified-chunk-contract",
    observerengine: "interest-grid",
    observer_engine: "interest-grid",
    spatialbroadcastgrid: "interest-grid",
    spatial_broadcast_grid: "interest-grid",
    active_chunks: "observed-chunk-set",

    // Snapshot / replay / persistence.
    snapshot: "snapshot-composer",
    snapshotcomposer: "snapshot-composer",
    snapshot_composer: "snapshot-composer",
    replay: "are-replay-buffer",
    replaybuffer: "are-replay-buffer",
    replay_buffer: "are-replay-buffer",
    persistence: "write-behind-persistence-queue",
    persistencemanager: "write-behind-persistence-queue",
    persistence_manager: "write-behind-persistence-queue",
    db_write: "write-behind-persistence-queue",
    save_queue: "write-behind-persistence-queue",

    // Client truth.
    client: "client-2d-snapshot-view",
    client_2d: "client-2d-snapshot-view",
    pixi: "client-2d-snapshot-view",
    frontend: "client-2d-snapshot-view",
    ui: "client-2d-snapshot-view",
    hud: "client-2d-snapshot-view",

    // Asset/runtime manifest truth.
    asset_manifest: "runtime-manifest",
    manifest: "runtime-manifest",
    runtime_manifest: "runtime-manifest",

    // Forbidden APIs.
    date_now: "forbidden-runtime-api",
    datenow: "forbidden-runtime-api",
    math_random: "forbidden-runtime-api",
    mathrandom: "forbidden-runtime-api",
    performance_now: "forbidden-runtime-api",
    setinterval: "forbidden-runtime-api",
    set_interval: "forbidden-runtime-api",
    fetch_in_tick: "forbidden-runtime-api",
  });

const FORBIDDEN_ALIASES: ReadonlySet<string> = new Set([
  "worldtick",
  "world_tick",
  "worldtick_ts",
  "world_tick_ts",
  "server_src_core_worldtick_ts",
  "old_worldtick",
  "legacy_worldtick",
  "date_now",
  "datenow",
  "math_random",
  "mathrandom",
  "performance_now",
  "setinterval",
  "set_interval",
  "fetch_in_tick",
]);

export class CoreRealityResolver {
  private static readonly DEFAULT_FALLBACK: CoreRealityModuleId =
    "module-port-contract";

  private readonly strict: boolean;
  private readonly fallbackModule: CoreRealityModuleId;

  constructor(options: CoreRealityResolverOptions = {}) {
    this.strict = options.strict ?? false;
    this.fallbackModule =
      options.fallbackModule ?? CoreRealityResolver.DEFAULT_FALLBACK;

    if (!CoreRealityResolver.isCanonical(this.fallbackModule)) {
      throw new CoreRealityResolverError({
        code: "UNKNOWN_CORE_REALITY_MODULE",
        input: this.fallbackModule,
        normalized: CoreRealityResolver.normalize(this.fallbackModule),
        allowedModules: CANONICAL_MODULES,
        message: `Invalid fallback module "${this.fallbackModule}".`,
      });
    }
  }

  public resolve(input: string): CoreRealityModuleId {
    return this.resolveDetailed(input).moduleId;
  }

  public resolveDetailed(input: string): CoreRealityResolution {
    const rawInput = String(input ?? "");
    const normalized = CoreRealityResolver.normalize(rawInput);

    if (CoreRealityResolver.isCanonical(normalized)) {
      return createResolution({
        input: rawInput,
        normalized,
        moduleId: normalized,
        source: "canonical",
        severity: "ok",
      });
    }

    const aliased = LEGACY_ALIASES[normalized];

    if (aliased) {
      const forbidden = FORBIDDEN_ALIASES.has(normalized);

      if (forbidden && this.strict) {
        const definition = CANONICAL_DEFINITIONS[aliased];

        throw new CoreRealityResolverError({
          code: "FORBIDDEN_CORE_REALITY_MODULE",
          input: rawInput,
          normalized,
          allowedModules: CANONICAL_MODULES,
          message:
            `Forbidden legacy module "${rawInput}" normalized as "${normalized}". ` +
            `Use "${aliased}" at "${definition.canonicalPath}".`,
        });
      }

      return createResolution({
        input: rawInput,
        normalized,
        moduleId: aliased,
        source: forbidden ? "forbidden" : "legacy-alias",
        severity: forbidden ? "blocked" : "migration",
      });
    }

    if (this.strict) {
      throw new CoreRealityResolverError({
        code: "UNKNOWN_CORE_REALITY_MODULE",
        input: rawInput,
        normalized,
        allowedModules: CANONICAL_MODULES,
        message:
          `Unknown ARE core module "${rawInput}" normalized as "${normalized}". ` +
          `Allowed modules: ${CANONICAL_MODULES.join(", ")}`,
      });
    }

    return createResolution({
      input: rawInput,
      normalized,
      moduleId: this.fallbackModule,
      source: "fallback",
      severity: "migration",
    });
  }

  public resolveMany(inputs: readonly string[]): readonly CoreRealityResolution[] {
    return Object.freeze(inputs.map((input) => this.resolveDetailed(input)));
  }

  public isValid(input: string): boolean {
    const normalized = CoreRealityResolver.normalize(input);

    return (
      CoreRealityResolver.isCanonical(normalized) ||
      LEGACY_ALIASES[normalized] !== undefined
    );
  }

  public isForbiddenLegacy(input: string): boolean {
    return FORBIDDEN_ALIASES.has(CoreRealityResolver.normalize(input));
  }

  public getAllowedModules(): readonly CoreRealityModuleId[] {
    return CANONICAL_MODULES;
  }

  public getDefinition(moduleId: CoreRealityModuleId): CoreRealityDefinition {
    return CANONICAL_DEFINITIONS[moduleId];
  }

  public getFallbackModule(): CoreRealityModuleId {
    return this.fallbackModule;
  }

  public isStrict(): boolean {
    return this.strict;
  }

  public static normalize(input: string): string {
    return String(input ?? "")
      .trim()
      .toLowerCase()
      .replace(/['"`]/g, "")
      .replace(/\.ts$/g, "_ts")
      .replace(/[\s./\\:-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  public static isCanonical(value: string): value is CoreRealityModuleId {
    return CANONICAL_SET.has(value);
  }
}

export const defaultCoreRealityResolver = new CoreRealityResolver();

export const strictCoreRealityResolver = new CoreRealityResolver({
  strict: true,
});

export function resolveCoreReality(input: string): CoreRealityModuleId {
  return defaultCoreRealityResolver.resolve(input);
}

export function resolveCoreRealityDetailed(
  input: string,
): CoreRealityResolution {
  return defaultCoreRealityResolver.resolveDetailed(input);
}

export function resolveCoreRealityStrict(input: string): CoreRealityModuleId {
  return strictCoreRealityResolver.resolve(input);
}

function createResolution(params: {
  readonly input: string;
  readonly normalized: string;
  readonly moduleId: CoreRealityModuleId;
  readonly source: CoreRealityResolutionSource;
  readonly severity: CoreRealitySeverity;
}): CoreRealityResolution {
  const definition = CANONICAL_DEFINITIONS[params.moduleId];

  return Object.freeze({
    input: params.input,
    normalized: params.normalized,
    moduleId: params.moduleId,
    source: params.source,
    severity: params.severity,
    canonicalPath: definition.canonicalPath,
    migrationNote: definition.migrationNote,
    forbiddenImports: definition.forbiddenImports,
    requiredProof: definition.requiredProof,
  });
      }
