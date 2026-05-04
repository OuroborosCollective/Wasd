// @ts-nocheck
import type {
  VoteBannerEntry,
  VoteSession,
  VoteVerifyResult,
} from "./voteTypes.js";

export type VoteProviderVerifyContext = {
  banner: VoteBannerEntry;
  session: VoteSession;
};

export type VoteProviderVoteUrlContext = {
  banner: VoteBannerEntry;
  session: VoteSession;
  callbackBaseUrl: string;
};

export interface VoteProviderAdapter {
  readonly key: string;
  buildVoteUrl(ctx: VoteProviderVoteUrlContext): string;
  verifyVote(ctx: VoteProviderVerifyContext): Promise<VoteVerifyResult>;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function readPath(input: unknown, path: string): unknown {
  const parts = path.split(".").map((s) => s.trim()).filter((s) => s.length > 0);
  let cursor: unknown = input;
  for (const part of parts) {
    if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

function toBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const t = value.trim().toLowerCase();
    return t === "1" || t === "true" || t === "yes" || t === "ok" || t === "voted";
  }
  return false;
}

export class CallbackTokenProviderAdapter implements VoteProviderAdapter {
  readonly key = "callback_token";

  buildVoteUrl(ctx: VoteProviderVoteUrlContext): string {
    const url = new URL(ctx.banner.targetUrl);
    url.searchParams.set("vote_session", ctx.session.id);
    url.searchParams.set("vote_callback_token", ctx.session.callbackToken);
    url.searchParams.set("vote_callback_url", `${ctx.callbackBaseUrl}/api/vote/callback`);
    url.searchParams.set("vote_provider", ctx.banner.providerKey);
    return url.toString();
  }

  async verifyVote(ctx: VoteProviderVerifyContext): Promise<VoteVerifyResult> {
    const callbackConfirmed = toBool(
      (ctx.session.providerEvidence ?? {})["callbackConfirmed"],
    );
    if (!callbackConfirmed) {
      return {
        verified: false,
        reason: "No callback confirmation yet.",
      };
    }
    return {
      verified: true,
      providerVoteId: asNonEmptyString(
        (ctx.session.providerEvidence ?? {})["providerVoteId"],
      ) ?? undefined,
      evidence:
        ctx.session.providerEvidence && typeof ctx.session.providerEvidence === "object"
          ? (ctx.session.providerEvidence as Record<string, unknown>)
          : undefined,
    };
  }
}

export class ApiPollProviderAdapter implements VoteProviderAdapter {
  readonly key = "api_poll";

  buildVoteUrl(ctx: VoteProviderVoteUrlContext): string {
    const url = new URL(ctx.banner.targetUrl);
    url.searchParams.set("vote_session", ctx.session.id);
    url.searchParams.set("player", ctx.session.playerId);
    return url.toString();
  }

  async verifyVote(ctx: VoteProviderVerifyContext): Promise<VoteVerifyResult> {
    const verifyApiUrlRaw =
      asNonEmptyString(ctx.banner.providerConfig["verifyApiUrl"]) ?? null;
    if (!verifyApiUrlRaw) {
      return {
        verified: false,
        reason: "verifyApiUrl missing in providerConfig.",
      };
    }

    let verifyUrl: URL;
    try {
      verifyUrl = new URL(verifyApiUrlRaw);
    } catch {
      return {
        verified: false,
        reason: "Invalid verifyApiUrl.",
      };
    }

    verifyUrl.searchParams.set("playerId", ctx.session.playerId);
    verifyUrl.searchParams.set("sessionId", ctx.session.id);
    verifyUrl.searchParams.set("bannerId", ctx.session.bannerId);
    const serverId = asNonEmptyString(ctx.banner.providerConfig["serverId"]);
    if (serverId) verifyUrl.searchParams.set("serverId", serverId);
    const externalVoteId = asNonEmptyString(ctx.banner.providerConfig["externalVoteId"]);
    if (externalVoteId) verifyUrl.searchParams.set("externalVoteId", externalVoteId);

    const timeoutMs = Math.max(
      2_000,
      Math.min(
        15_000,
        Number(ctx.banner.providerConfig["verifyTimeoutMs"] ?? 6_000) || 6_000,
      ),
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = new Headers();
      headers.set("accept", "application/json, text/plain;q=0.9");
      const authHeader = asNonEmptyString(
        ctx.banner.providerConfig["verifyAuthHeader"],
      );
      const authToken = asNonEmptyString(
        ctx.banner.providerConfig["verifyAuthToken"],
      );
      if (authHeader && authToken) headers.set(authHeader, authToken);
      const res = await fetch(verifyUrl.toString(), {
        method: "GET",
        headers,
        signal: controller.signal,
      });
      if (!res.ok) {
        return {
          verified: false,
          reason: `Provider verify failed (${res.status}).`,
          retryAfterMs: 4_000,
        };
      }
      const ct = res.headers.get("content-type") ?? "";
      const body: unknown = ct.includes("application/json")
        ? await res.json()
        : await res.text();
      const votedPath =
        asNonEmptyString(ctx.banner.providerConfig["votedFieldPath"]) ?? "voted";
      const voteIdPath =
        asNonEmptyString(ctx.banner.providerConfig["voteIdFieldPath"]) ?? "voteId";
      const voted = toBool(typeof body === "string" ? body : readPath(body, votedPath));
      const providerVoteId = asNonEmptyString(
        typeof body === "string" ? undefined : readPath(body, voteIdPath),
      ) ?? undefined;
      return {
        verified: voted,
        providerVoteId,
        evidence:
          body && typeof body === "object" && !Array.isArray(body)
            ? (body as Record<string, unknown>)
            : { raw: body },
        reason: voted ? undefined : "Provider returned not-voted.",
      };
    } catch (error) {
      return {
        verified: false,
        reason:
          error instanceof Error
            ? `Provider verify request failed: ${error.message}`
            : "Provider verify request failed.",
        retryAfterMs: 5_000,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

export class VoteProviderRegistry {
  private readonly adapters = new Map<string, VoteProviderAdapter>();
  private readonly fallbackAdapter = new CallbackTokenProviderAdapter();

  constructor() {
    this.register(new CallbackTokenProviderAdapter());
    this.register(new ApiPollProviderAdapter());
  }

  register(adapter: VoteProviderAdapter): void {
    this.adapters.set(adapter.key, adapter);
  }

  resolve(mode: VoteBannerEntry["verificationMode"]): VoteProviderAdapter {
    return this.adapters.get(mode) ?? this.fallbackAdapter;
  }
}

