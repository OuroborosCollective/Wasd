export interface QuickNodeAttestationConfig {
  readonly rpcUrl: string;
  readonly expectedChainId: string | null;
  readonly timeoutMs: number;
}

export interface QuickNodeAttestationSnapshot {
  readonly available: boolean;
  readonly configured: boolean;
  readonly chainId: string | null;
  readonly expectedChainId: string | null;
  readonly chainIdMatches: boolean | null;
  readonly blockNumber: string | null;
  readonly error: string | null;
}

type AllowedQuickNodeMethod = "eth_chainId" | "eth_blockNumber";

type JsonRpcRequest = Readonly<{
  jsonrpc: "2.0";
  id: number;
  method: AllowedQuickNodeMethod;
  params: readonly [];
}>;

type QuickNodeTransport = (
  rpcUrl: string,
  request: JsonRpcRequest,
  timeoutMs: number,
) => Promise<unknown>;

const DEFAULT_TIMEOUT_MS = 4_000;
const MAX_TIMEOUT_MS = 15_000;
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;

function clampTimeout(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(MAX_TIMEOUT_MS, Math.max(250, Math.trunc(parsed)));
}

function normalizeHexQuantity(value: string, fieldName: string): string {
  const normalized = value.trim().toLowerCase();
  if (!HEX_QUANTITY.test(normalized)) {
    throw new Error(`${fieldName} must be a canonical JSON-RPC hex quantity`);
  }
  return normalized;
}

export function resolveQuickNodeAttestationConfig(
  env: NodeJS.ProcessEnv = process.env,
): QuickNodeAttestationConfig | null {
  const rawUrl = env.QUICKNODE_RPC_URL?.trim() ?? "";
  if (!rawUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;

  const rawExpected = env.QUICKNODE_EXPECTED_CHAIN_ID?.trim() ?? "";
  let expectedChainId: string | null = null;
  if (rawExpected) {
    try {
      expectedChainId = normalizeHexQuantity(rawExpected, "QUICKNODE_EXPECTED_CHAIN_ID");
    } catch {
      return null;
    }
  }

  return Object.freeze({
    rpcUrl: parsed.toString(),
    expectedChainId,
    timeoutMs: clampTimeout(env.QUICKNODE_TIMEOUT_MS),
  });
}

function buildRequest(method: AllowedQuickNodeMethod, id: number): JsonRpcRequest {
  const params: readonly [] = [];
  return Object.freeze({ jsonrpc: "2.0" as const, id, method, params });
}

async function defaultTransport(
  rpcUrl: string,
  request: JsonRpcRequest,
  timeoutMs: number,
): Promise<unknown> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`rpc_http_${response.status}`);
  return response.json();
}

function readResult(payload: unknown, expectedId: number, fieldName: string): string {
  if (!payload || typeof payload !== "object") throw new Error(`${fieldName}_invalid_response`);
  const record = payload as Record<string, unknown>;
  if (record.jsonrpc !== "2.0" || Number(record.id) !== expectedId) {
    throw new Error(`${fieldName}_invalid_envelope`);
  }
  if (record.error !== undefined && record.error !== null) {
    throw new Error(`${fieldName}_rpc_error`);
  }
  if (typeof record.result !== "string") throw new Error(`${fieldName}_missing_result`);
  return normalizeHexQuantity(record.result, fieldName);
}

/**
 * Read-only external attestation probe.
 *
 * The blockchain endpoint is never a source of gameplay authority. This
 * class has no mutation/signing surface and can only request chain metadata.
 * Its snapshot must remain outside TickSystem, canonical intent validation,
 * reducers, persistence, manifests and world hashes.
 */
export class QuickNodeExternalAttestation {
  constructor(
    private readonly configProvider: () => QuickNodeAttestationConfig | null = () => resolveQuickNodeAttestationConfig(),
    private readonly transport: QuickNodeTransport = defaultTransport,
  ) {}

  getConfigurationStatus(): QuickNodeAttestationSnapshot {
    const config = this.configProvider();
    return Object.freeze({
      available: false,
      configured: Boolean(config),
      chainId: null,
      expectedChainId: config?.expectedChainId ?? null,
      chainIdMatches: null,
      blockNumber: null,
      error: config ? null : "quicknode_not_configured",
    });
  }

  async probe(): Promise<QuickNodeAttestationSnapshot> {
    const config = this.configProvider();
    if (!config) return this.getConfigurationStatus();

    try {
      const chainPayload = await this.transport(config.rpcUrl, buildRequest("eth_chainId", 1), config.timeoutMs);
      const blockPayload = await this.transport(config.rpcUrl, buildRequest("eth_blockNumber", 2), config.timeoutMs);
      const chainId = readResult(chainPayload, 1, "chain_id");
      const blockNumber = readResult(blockPayload, 2, "block_number");
      const chainIdMatches = config.expectedChainId === null ? null : chainId === config.expectedChainId;

      return Object.freeze({
        available: chainIdMatches !== false,
        configured: true,
        chainId,
        expectedChainId: config.expectedChainId,
        chainIdMatches,
        blockNumber,
        error: chainIdMatches === false ? "unexpected_chain_id" : null,
      });
    } catch (error) {
      return Object.freeze({
        available: false,
        configured: true,
        chainId: null,
        expectedChainId: config.expectedChainId,
        chainIdMatches: null,
        blockNumber: null,
        error: error instanceof Error ? error.message : "quicknode_probe_failed",
      });
    }
  }
}

export const quickNodeExternalAttestation = new QuickNodeExternalAttestation();
