export const QUICKNODE_TRUTH_CLASS = "SIDE_CHANNEL_EXTERNAL_ATTESTATION" as const;

const READ_ONLY_METHODS = new Set(["eth_chainId", "eth_blockNumber"]);
const DEFAULT_PROBE_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 5_000;

type RpcResponse = {
  jsonrpc?: string;
  id?: number;
  result?: unknown;
  error?: { code?: number; message?: string };
};

export interface QuicknodeReadOnlyStatus {
  readonly truthClass: typeof QUICKNODE_TRUTH_CLASS;
  readonly configured: boolean;
  readonly enabled: boolean;
  readonly endpointHost: string | null;
  readonly expectedChainId: string | null;
  readonly observedChainId: string | null;
  readonly observedBlockNumber: string | null;
  readonly chainMatchesExpectation: boolean | null;
  readonly successfulProbes: number;
  readonly failedProbes: number;
  readonly lastError: string | null;
}

function envTruthy(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function normalizeChainId(value: string | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) return null;
  if (/^0x[0-9a-f]+$/.test(trimmed)) return trimmed;
  if (/^[0-9]+$/.test(trimmed)) return `0x${BigInt(trimmed).toString(16)}`;
  throw new Error("QUICKNODE_EXPECTED_CHAIN_ID must be a decimal or 0x-prefixed integer.");
}

function parseEndpoint(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("QUICKNODE_RPC_URL must use HTTPS.");
  if (!url.hostname) throw new Error("QUICKNODE_RPC_URL must contain a hostname.");
  return url;
}

/**
 * Read-only Quicknode observer. It can attest external chain metadata, but the
 * result never participates in ARE tick calculation, gameplay validation or
 * world hashes. There are deliberately no transaction/signing methods here.
 */
export class QuicknodeReadOnlyObserver {
  private readonly rawUrl = process.env.QUICKNODE_RPC_URL?.trim() ?? "";
  private readonly expectedChainId = normalizeChainId(process.env.QUICKNODE_EXPECTED_CHAIN_ID);
  private readonly enabledByConfig = envTruthy(process.env.QUICKNODE_ENABLED);
  private readonly endpoint = this.rawUrl ? parseEndpoint(this.rawUrl) : null;
  private timer: NodeJS.Timeout | null = null;
  private probing = false;
  private observedChainId: string | null = null;
  private observedBlockNumber: string | null = null;
  private successfulProbes = 0;
  private failedProbes = 0;
  private lastError: string | null = null;

  get enabled(): boolean {
    return this.enabledByConfig && Boolean(this.endpoint);
  }

  start(): void {
    if (!this.enabled || this.timer) return;
    const configuredMs = Number(process.env.QUICKNODE_PROBE_MS ?? DEFAULT_PROBE_MS);
    const probeMs = Number.isFinite(configuredMs) ? Math.max(10_000, Math.trunc(configuredMs)) : DEFAULT_PROBE_MS;
    void this.probe();
    this.timer = setInterval(() => void this.probe(), probeMs);
    this.timer.unref?.();
  }

  async callReadOnly(method: "eth_chainId" | "eth_blockNumber"): Promise<string> {
    if (!READ_ONLY_METHODS.has(method)) throw new Error(`Quicknode RPC method is not allowlisted: ${method}`);
    if (!this.enabled || !this.endpoint) throw new Error("Quicknode read-only observer is not enabled/configured.");

    const controller = new AbortController();
    const configuredTimeout = Number(process.env.QUICKNODE_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
    const timeoutMs = Number.isFinite(configuredTimeout) ? Math.max(500, Math.trunc(configuredTimeout)) : DEFAULT_TIMEOUT_MS;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(this.endpoint.toString(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Quicknode HTTP ${response.status}`);
      const payload = (await response.json()) as RpcResponse;
      if (payload.error) throw new Error(`Quicknode RPC ${payload.error.code ?? "error"}: ${payload.error.message ?? "unknown"}`);
      if (typeof payload.result !== "string" || payload.result.length === 0) throw new Error(`Quicknode ${method} returned no string result.`);
      return payload.result.toLowerCase();
    } finally {
      clearTimeout(timeout);
    }
  }

  async probe(): Promise<void> {
    if (!this.enabled || this.probing) return;
    this.probing = true;
    try {
      const [chainId, blockNumber] = await Promise.all([
        this.callReadOnly("eth_chainId"),
        this.callReadOnly("eth_blockNumber"),
      ]);
      this.observedChainId = chainId;
      this.observedBlockNumber = blockNumber;
      this.successfulProbes += 1;
      this.lastError = this.expectedChainId && chainId !== this.expectedChainId
        ? `chain_id_mismatch expected=${this.expectedChainId} observed=${chainId}`
        : null;
    } catch (error) {
      this.failedProbes += 1;
      this.lastError = error instanceof Error ? error.message : String(error);
    } finally {
      this.probing = false;
    }
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  getStatus(): QuicknodeReadOnlyStatus {
    return {
      truthClass: QUICKNODE_TRUTH_CLASS,
      configured: Boolean(this.endpoint),
      enabled: this.enabled,
      endpointHost: this.endpoint?.hostname ?? null,
      expectedChainId: this.expectedChainId,
      observedChainId: this.observedChainId,
      observedBlockNumber: this.observedBlockNumber,
      chainMatchesExpectation:
        this.expectedChainId && this.observedChainId
          ? this.expectedChainId === this.observedChainId
          : null,
      successfulProbes: this.successfulProbes,
      failedProbes: this.failedProbes,
      lastError: this.lastError,
    };
  }
}

export const quicknodeReadOnly = new QuicknodeReadOnlyObserver();
