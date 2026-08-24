import { describe, expect, it } from "vitest";
import {
  QuickNodeExternalAttestation,
  resolveQuickNodeAttestationConfig,
  type QuickNodeAttestationConfig,
} from "../../attestation/QuickNodeExternalAttestation.js";

const CONFIG: QuickNodeAttestationConfig = Object.freeze({
  rpcUrl: "https://example.quiknode.pro/test-token/",
  expectedChainId: "0x1",
  timeoutMs: 1_000,
});

describe("QuickNodeExternalAttestation", () => {
  it("is disabled without a real HTTPS endpoint", () => {
    expect(resolveQuickNodeAttestationConfig({})).toBeNull();
    expect(resolveQuickNodeAttestationConfig({ QUICKNODE_RPC_URL: "http://example.com" })).toBeNull();
    expect(resolveQuickNodeAttestationConfig({ QUICKNODE_RPC_URL: "not-a-url" })).toBeNull();
    expect(resolveQuickNodeAttestationConfig({ QUICKNODE_RPC_URL: "https://user:pass@example.com" })).toBeNull();
  });

  it("allows only chainId and blockNumber probes", async () => {
    const methods: string[] = [];
    const attestation = new QuickNodeExternalAttestation(
      () => CONFIG,
      async (_url, request) => {
        methods.push(request.method);
        if (request.method === "eth_chainId") {
          return { jsonrpc: "2.0", id: request.id, result: "0x1" };
        }
        return { jsonrpc: "2.0", id: request.id, result: "0x10" };
      },
    );

    const result = await attestation.probe();

    expect(methods).toEqual(["eth_chainId", "eth_blockNumber"]);
    expect(result).toEqual({
      available: true,
      configured: true,
      chainId: "0x1",
      expectedChainId: "0x1",
      chainIdMatches: true,
      blockNumber: "0x10",
      error: null,
    });
  });

  it("surfaces expected chain mismatch instead of accepting it", async () => {
    const attestation = new QuickNodeExternalAttestation(
      () => CONFIG,
      async (_url, request) => ({
        jsonrpc: "2.0",
        id: request.id,
        result: request.method === "eth_chainId" ? "0xaa36a7" : "0x20",
      }),
    );

    await expect(attestation.probe()).resolves.toMatchObject({
      available: false,
      configured: true,
      chainId: "0xaa36a7",
      expectedChainId: "0x1",
      chainIdMatches: false,
      error: "unexpected_chain_id",
    });
  });

  it("turns transport failure into unavailable attestation only", async () => {
    const attestation = new QuickNodeExternalAttestation(
      () => CONFIG,
      async () => {
        throw new Error("rpc_transport_down");
      },
    );

    await expect(attestation.probe()).resolves.toEqual({
      available: false,
      configured: true,
      chainId: null,
      expectedChainId: "0x1",
      chainIdMatches: null,
      blockNumber: null,
      error: "rpc_transport_down",
    });
  });
});
