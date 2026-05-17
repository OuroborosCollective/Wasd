export type AreloriaNotificationTopic =
  | "city_under_attack"
  | "guild_invite"
  | "market_sale"
  | "dungeon_raid_starting"
  | "liveheal_anomaly"
  | "glb_asset_quarantined"
  | "deploy_failed"
  | "beta_key_invite"
  | "maintenance_notice"
  | string;

export type AreloriaSubscriberProfile = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  locale?: string;
  phone?: string;
  data?: Record<string, unknown>;
};

export type AreloriaNotificationInput = {
  topic: AreloriaNotificationTopic;
  subscriber: string | AreloriaSubscriberProfile;
  payload?: Record<string, unknown>;
  actor?: string;
  tenant?: string;
  context?: Record<string, unknown>;
};

export type AreloriaNotificationResult =
  | { ok: true; provider: "novu"; skipped: false; topic: string; subscriberId: string; status: number; response: unknown }
  | { ok: true; provider: "noop"; skipped: true; reason: string; topic: string; subscriberId: string }
  | { ok: false; provider: "novu"; skipped: false; topic: string; subscriberId: string; status: number; error: string; response?: unknown };

type NovuTriggerBody = {
  name: string;
  to: Record<string, unknown>;
  payload: Record<string, unknown>;
  overrides?: Record<string, unknown>;
  context?: Record<string, unknown>;
};

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function envBool(name: string, fallback = false): boolean {
  const value = env(name).toLowerCase();
  if (!value) return fallback;
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function sanitizeTopic(topic: string): string {
  return topic.trim().replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, 120) || "areloria_notification";
}

function subscriberToNovu(subscriber: string | AreloriaSubscriberProfile): { subscriberId: string; body: Record<string, unknown> } {
  if (typeof subscriber === "string") {
    const subscriberId = subscriber.trim();
    return { subscriberId, body: { subscriberId } };
  }

  const subscriberId = subscriber.id.trim();
  const body: Record<string, unknown> = { subscriberId };
  if (subscriber.email) body.email = subscriber.email;
  if (subscriber.firstName) body.firstName = subscriber.firstName;
  if (subscriber.lastName) body.lastName = subscriber.lastName;
  if (subscriber.avatar) body.avatar = subscriber.avatar;
  if (subscriber.locale) body.locale = subscriber.locale;
  if (subscriber.phone) body.phone = subscriber.phone;
  if (subscriber.data) body.data = subscriber.data;
  return { subscriberId, body };
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 2000);
  }
}

export class NovuNotificationService {
  private readonly enabled = envBool("NOVU_ENABLED", false);
  private readonly apiKey = env("NOVU_API_KEY");
  private readonly apiUrl = env("NOVU_API_URL") || "https://api.novu.co";
  private readonly workflowPrefix = env("NOVU_WORKFLOW_PREFIX") || "areloria";
  private readonly dryRun = envBool("NOVU_DRY_RUN", !this.enabled);

  isConfigured(): boolean {
    return this.enabled && Boolean(this.apiKey);
  }

  status() {
    return {
      enabled: this.enabled,
      configured: this.isConfigured(),
      dryRun: this.dryRun,
      apiUrl: this.apiUrl,
      workflowPrefix: this.workflowPrefix,
    };
  }

  workflowName(topic: string): string {
    const sanitized = sanitizeTopic(topic);
    return this.workflowPrefix ? `${this.workflowPrefix}.${sanitized}` : sanitized;
  }

  async notify(input: AreloriaNotificationInput): Promise<AreloriaNotificationResult> {
    const { subscriberId, body: subscriber } = subscriberToNovu(input.subscriber);
    const topic = sanitizeTopic(input.topic);

    if (!subscriberId) {
      return { ok: false, provider: "novu", skipped: false, topic, subscriberId, status: 400, error: "subscriber_id_required" };
    }

    if (!this.isConfigured() || this.dryRun) {
      return {
        ok: true,
        provider: "noop",
        skipped: true,
        reason: this.enabled ? "novu_dry_run" : "novu_disabled",
        topic,
        subscriberId,
      };
    }

    const body: NovuTriggerBody = {
      name: this.workflowName(topic),
      to: subscriber,
      payload: {
        topic,
        actor: input.actor ?? "system",
        project: "areloria-wasd",
        ...(input.payload ?? {}),
      },
    };

    if (input.tenant) body.overrides = { tenant: { identifier: input.tenant } };
    if (input.context) body.context = input.context;

    try {
      const response = await fetch(`${this.apiUrl.replace(/\/$/, "")}/v1/events/trigger`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `ApiKey ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      const parsed = await parseResponse(response);
      if (!response.ok) {
        return {
          ok: false,
          provider: "novu",
          skipped: false,
          topic,
          subscriberId,
          status: response.status,
          error: "novu_trigger_failed",
          response: parsed,
        };
      }
      return { ok: true, provider: "novu", skipped: false, topic, subscriberId, status: response.status, response: parsed };
    } catch (error) {
      return {
        ok: false,
        provider: "novu",
        skipped: false,
        topic,
        subscriberId,
        status: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async notifyAdmin(topic: AreloriaNotificationTopic, payload?: Record<string, unknown>): Promise<AreloriaNotificationResult> {
    const adminSubscriber = env("NOVU_ADMIN_SUBSCRIBER_ID") || "areloria-admin";
    const adminEmail = env("NOVU_ADMIN_EMAIL");
    return this.notify({
      topic,
      subscriber: adminEmail ? { id: adminSubscriber, email: adminEmail, firstName: "Areloria", lastName: "Admin" } : adminSubscriber,
      payload,
      actor: "server",
    });
  }
}

export const novuNotificationService = new NovuNotificationService();
