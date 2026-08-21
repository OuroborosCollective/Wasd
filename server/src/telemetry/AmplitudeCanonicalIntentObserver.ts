import { createHash } from "node:crypto";
import type { ServerCanonicalIntent } from "../intents/ServerCanonicalIntent.js";

export type AmplitudeRegion = "us" | "eu";

export interface AmplitudeObserverConfig {
  readonly apiKey: string;
  readonly identitySalt: string;
  readonly region: AmplitudeRegion;
  readonly maxQueueSize: number;
  readonly maxBatchSize: number;
}

export interface AmplitudeCanonicalIntentEvent {
  readonly event_type: "canonical_intent_accepted";
  readonly user_id: string;
  readonly insert_id: string;
  readonly event_properties: {
    readonly action: string;
    readonly tick_id: string;
    readonly logical_index: number;
    readonly received_order: number;
    readonly chunk_key: string;
    readonly intent_hash: string;
  };
}

export interface AmplitudeObserverDiagnostics {
  readonly enabled: boolean;
  readonly region: AmplitudeRegion | null;
  readonly queueDepth: number;
  readonly observed: number;
  readonly sent: number;
  readonly failed: number;
  readonly dropped: number;
  readonly inFlight: boolean;
  readonly lastHttpStatus: number | null;
}

type ConfigProvider = () => AmplitudeObserverConfig | null;
type FlushScheduler = (callback: () => void) => void;
type AmplitudeTransport = (
  url: string,
  payload: { readonly api_key: string; readonly events: readonly AmplitudeCanonicalIntentEvent[] },
) => Promise<{ readonly ok: boolean; readonly status: number }>;

const DEFAULT_MAX_QUEUE_SIZE = 2_000;
const DEFAULT_MAX_BATCH_SIZE = 50;
const US_ENDPOINT = "https://api2.amplitude.com/2/httpapi";
const EU_ENDPOINT = "https://api.eu.amplitude.com/2/httpapi";

function clampPositiveInteger(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(max, Math.max(1, Math.trunc(parsed)));
}

export function resolveAmplitudeObserverConfig(
  env: NodeJS.ProcessEnv = process.env,
): AmplitudeObserverConfig | null {
  const apiKey = env.AMPLITUDE_API_KEY?.trim() ?? "";
  const identitySalt = env.AMPLITUDE_IDENTITY_SALT?.trim() ?? "";
  if (!apiKey || !identitySalt) return null;

  const region: AmplitudeRegion = env.AMPLITUDE_REGION?.trim().toLowerCase() === "eu" ? "eu" : "us";
  return Object.freeze({
    apiKey,
    identitySalt,
    region,
    maxQueueSize: clampPositiveInteger(env.AMPLITUDE_MAX_QUEUE_SIZE, DEFAULT_MAX_QUEUE_SIZE, 20_000),
    maxBatchSize: clampPositiveInteger(env.AMPLITUDE_MAX_BATCH_SIZE, DEFAULT_MAX_BATCH_SIZE, 100),
  });
}

export function pseudonymizeAmplitudeActorId(actorId: string, identitySalt: string): string {
  return createHash("sha256")
    .update("areloria:amplitude:actor:v1\0", "utf8")
    .update(identitySalt, "utf8")
    .update("\0", "utf8")
    .update(actorId, "utf8")
    .digest("hex");
}

export function projectCanonicalIntentForAmplitude(
  intent: ServerCanonicalIntent,
  identitySalt: string,
): AmplitudeCanonicalIntentEvent {
  return Object.freeze({
    event_type: "canonical_intent_accepted" as const,
    user_id: pseudonymizeAmplitudeActorId(intent.actorId, identitySalt),
    insert_id: intent.intentHash,
    event_properties: Object.freeze({
      action: String(intent.action),
      tick_id: String(intent.tickId),
      logical_index: Number(intent.logicalIndex),
      received_order: Number(intent.receivedOrder),
      chunk_key: String(intent.chunkKey),
      intent_hash: String(intent.intentHash),
    }),
  });
}

async function defaultAmplitudeTransport(
  url: string,
  payload: { readonly api_key: string; readonly events: readonly AmplitudeCanonicalIntentEvent[] },
): Promise<{ readonly ok: boolean; readonly status: number }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5_000),
  });
  return { ok: response.ok, status: response.status };
}

function defaultFlushScheduler(callback: () => void): void {
  queueMicrotask(callback);
}

/**
 * Non-authoritative observer for accepted ServerCanonicalIntent records.
 *
 * This component is deliberately one-way:
 * - it receives an immutable projection only after CanonicalIntentIntake records the intent;
 * - it cannot return values to the tick, reducer, ordering, manifest or world hash;
 * - missing credentials disable it;
 * - transport failures only affect observer diagnostics.
 */
export class AmplitudeCanonicalIntentObserver {
  private readonly queue: AmplitudeCanonicalIntentEvent[] = [];
  private flushScheduled = false;
  private inFlight = false;
  private observed = 0;
  private sent = 0;
  private failed = 0;
  private dropped = 0;
  private lastHttpStatus: number | null = null;

  constructor(
    private readonly configProvider: ConfigProvider = () => resolveAmplitudeObserverConfig(),
    private readonly transport: AmplitudeTransport = defaultAmplitudeTransport,
    private readonly scheduleFlush: FlushScheduler = defaultFlushScheduler,
  ) {}

  observe(intent: ServerCanonicalIntent): void {
    const config = this.configProvider();
    if (!config) return;

    this.observed += 1;
    if (this.queue.length >= config.maxQueueSize) {
      this.dropped += 1;
      return;
    }

    this.queue.push(projectCanonicalIntentForAmplitude(intent, config.identitySalt));
    if (!this.flushScheduled) {
      this.flushScheduled = true;
      this.scheduleFlush(() => {
        this.flushScheduled = false;
        void this.flush();
      });
    }
  }

  async flush(): Promise<void> {
    if (this.inFlight) return;
    const config = this.configProvider();
    if (!config || this.queue.length === 0) return;

    const events = this.queue.splice(0, config.maxBatchSize);
    this.inFlight = true;
    try {
      const endpoint = config.region === "eu" ? EU_ENDPOINT : US_ENDPOINT;
      const result = await this.transport(endpoint, { api_key: config.apiKey, events });
      this.lastHttpStatus = result.status;
      if (result.ok) this.sent += events.length;
      else this.failed += events.length;
    } catch {
      this.lastHttpStatus = null;
      this.failed += events.length;
    } finally {
      this.inFlight = false;
      if (this.queue.length > 0 && !this.flushScheduled) {
        this.flushScheduled = true;
        this.scheduleFlush(() => {
          this.flushScheduled = false;
          void this.flush();
        });
      }
    }
  }

  getDiagnostics(): AmplitudeObserverDiagnostics {
    const config = this.configProvider();
    return Object.freeze({
      enabled: Boolean(config),
      region: config?.region ?? null,
      queueDepth: this.queue.length,
      observed: this.observed,
      sent: this.sent,
      failed: this.failed,
      dropped: this.dropped,
      inFlight: this.inFlight,
      lastHttpStatus: this.lastHttpStatus,
    });
  }
}

export const amplitudeCanonicalIntentObserver = new AmplitudeCanonicalIntentObserver();
