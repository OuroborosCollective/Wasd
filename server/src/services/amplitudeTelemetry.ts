import { createHmac } from "node:crypto";

export const AMPLITUDE_TRUTH_CLASS = "SIDE_CHANNEL_TELEMETRY" as const;

export interface CanonicalIntentObservation {
  readonly action: string;
  readonly actorId: string;
  readonly tickId: number;
  readonly chunkKey: string;
  readonly intentHash: string;
}

type AmplitudeEvent = {
  user_id: string;
  event_type: string;
  time: number;
  event_properties: Record<string, string | number | boolean | null>;
};

export interface AmplitudeTelemetryStatus {
  readonly truthClass: typeof AMPLITUDE_TRUTH_CLASS;
  readonly configured: boolean;
  readonly enabled: boolean;
  readonly region: "US" | "EU";
  readonly endpoint: string;
  readonly queuedEvents: number;
  readonly sentEvents: number;
  readonly failedEvents: number;
  readonly lastError: string | null;
}

const MAX_BATCH_SIZE = 10;
const DEFAULT_FLUSH_MS = 1_000;
const MAX_QUEUE_SIZE = 2_000;

function envTruthy(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function finiteTick(value: unknown): number {
  const tick = Number(value);
  return Number.isSafeInteger(tick) && tick >= 0 ? tick : 0;
}

function safeString(value: unknown, max = 256): string {
  return String(value ?? "").slice(0, max);
}

/**
 * Non-authoritative analytics transport.
 *
 * Wall clock, network I/O, retries and failures are deliberately isolated from
 * gameplay causality. This service only observes already-accepted facts and is
 * never awaited by the deterministic tick/intake path.
 */
export class AmplitudeTelemetry {
  private readonly apiKey = process.env.AMPLITUDE_API_KEY?.trim() ?? "";
  private readonly identitySalt = process.env.AMPLITUDE_ID_SALT?.trim() ?? "";
  private readonly region: "US" | "EU" = process.env.AMPLITUDE_REGION?.trim().toUpperCase() === "EU" ? "EU" : "US";
  private readonly endpoint = this.region === "EU"
    ? "https://api.eu.amplitude.com/2/httpapi"
    : "https://api2.amplitude.com/2/httpapi";
  private readonly enabled = envTruthy(process.env.AMPLITUDE_ENABLED) && Boolean(this.apiKey) && Boolean(this.identitySalt);
  private readonly queue: AmplitudeEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private flushing = false;
  private sentEvents = 0;
  private failedEvents = 0;
  private lastError: string | null = null;

  start(): void {
    if (!this.enabled || this.flushTimer) return;
    const configuredMs = Number(process.env.AMPLITUDE_FLUSH_MS ?? DEFAULT_FLUSH_MS);
    const flushMs = Number.isFinite(configuredMs) ? Math.max(250, Math.trunc(configuredMs)) : DEFAULT_FLUSH_MS;
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, flushMs);
    this.flushTimer.unref?.();
  }

  observeCanonicalIntent(observation: CanonicalIntentObservation): void {
    if (!this.enabled) return;
    this.enqueue({
      user_id: this.pseudonymousActorId(observation.actorId),
      event_type: "canonical_intent_recorded",
      time: Date.now(),
      event_properties: {
        action: safeString(observation.action, 80),
        tick_id: finiteTick(observation.tickId),
        chunk_key: safeString(observation.chunkKey, 160),
        intent_hash: safeString(observation.intentHash, 64),
        world_id: safeString(process.env.WORLD_ID || "areloria", 120),
        source: "server_canonical_intake",
      },
    });
  }

  trackSystemEvent(eventType: "server_started" | "server_stopping", properties: Record<string, string | number | boolean | null> = {}): void {
    if (!this.enabled) return;
    this.enqueue({
      user_id: this.pseudonymousActorId(`system:${process.env.WORLD_ID || "areloria"}`),
      event_type: eventType,
      time: Date.now(),
      event_properties: {
        world_id: safeString(process.env.WORLD_ID || "areloria", 120),
        ...properties,
      },
    });
  }

  private enqueue(event: AmplitudeEvent): void {
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      this.failedEvents += 1;
      this.lastError = "telemetry_queue_full";
      return;
    }
    this.queue.push(event);
    if (this.queue.length >= MAX_BATCH_SIZE) void this.flush();
  }

  private pseudonymousActorId(actorId: string): string {
    return createHmac("sha256", this.identitySalt)
      .update(actorId, "utf8")
      .digest("hex");
  }

  async flush(): Promise<void> {
    if (!this.enabled || this.flushing || this.queue.length === 0) return;
    this.flushing = true;
    const batch = this.queue.splice(0, MAX_BATCH_SIZE);
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ api_key: this.apiKey, events: batch }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`Amplitude ${response.status}: ${detail.slice(0, 300)}`);
      }
      this.sentEvents += batch.length;
      this.lastError = null;
    } catch (error) {
      this.failedEvents += batch.length;
      this.lastError = error instanceof Error ? error.message : String(error);
      // Telemetry is not gameplay truth. Do not retry indefinitely or block the
      // server; preserve bounded memory and surface the failure in status.
    } finally {
      this.flushing = false;
    }
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = null;
    while (this.enabled && this.queue.length > 0) {
      const before = this.queue.length;
      await this.flush();
      if (this.queue.length >= before) break;
    }
  }

  getStatus(): AmplitudeTelemetryStatus {
    return {
      truthClass: AMPLITUDE_TRUTH_CLASS,
      configured: Boolean(this.apiKey) && Boolean(this.identitySalt),
      enabled: this.enabled,
      region: this.region,
      endpoint: this.endpoint,
      queuedEvents: this.queue.length,
      sentEvents: this.sentEvents,
      failedEvents: this.failedEvents,
      lastError: this.lastError,
    };
  }
}

export const amplitudeTelemetry = new AmplitudeTelemetry();
