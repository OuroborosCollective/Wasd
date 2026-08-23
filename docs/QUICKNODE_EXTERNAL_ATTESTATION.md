# QuickNode External Attestation

Status: integration candidate for AIM-131 / GitHub #2573. This document does **not** claim a working QuickNode endpoint.

## Purpose

QuickNode is allowed only as a read-only external-attestation side-channel. Blockchain RPC data is never gameplay authority and must not participate in canonical intent validation, tick ordering, reducers, persistence, manifests, deterministic seeds, Kappa computation or world hashes.

The integration exposes exactly two metadata probes internally:

```text
eth_chainId
eth_blockNumber
```

There is no generic RPC method parameter and no signing/transaction surface.

## Configuration

The integration is disabled unless `QUICKNODE_RPC_URL` parses as HTTPS. URLs containing embedded username/password credentials are rejected.

```text
QUICKNODE_RPC_URL=
QUICKNODE_EXPECTED_CHAIN_ID=   # optional canonical hex quantity, e.g. 0x1
QUICKNODE_TIMEOUT_MS=4000
```

If `QUICKNODE_EXPECTED_CHAIN_ID` is configured and the probe returns another chain, the attestation reports `unexpected_chain_id` and `available:false`.

## Failure semantics

- missing/invalid endpoint: `configured:false`, `available:false`;
- HTTP/JSON-RPC/transport failure: `configured:true`, `available:false` with an explicit error;
- chain mismatch: `available:false`;
- successful chain/block metadata probe: `available:true`.

None of these states may pause or mutate gameplay.

## External state and Green rule

As of 2026-08-21 the connected QuickNode control-plane call fails with HTTP 403 because the configured `x-api-key` is incorrect or malformed. Therefore no endpoint can honestly be created or read back through the connected QuickNode account yet.

Repository code/tests may prove the read-only interface and fail-closed behavior, but operational Green additionally requires:

1. valid QuickNode account authentication;
2. a real HTTPS RPC endpoint;
3. a successful `eth_chainId` and `eth_blockNumber` probe against that endpoint;
4. optional expected-chain verification if configured;
5. runtime/operator readback bound to the deployed WASD revision.

Until those conditions exist, QuickNode remains an unavailable side-channel, not a release blocker for the deterministic game runtime.
