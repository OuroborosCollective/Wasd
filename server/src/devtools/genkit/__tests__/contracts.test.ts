import { describe, expect, it } from "vitest";
import { ARELORIA_GENKIT_FLOW_CATALOG } from "../catalog.js";
import {
  assertSideChannelPayload,
  canonicalizeForReceipt,
  createProposalEnvelope,
  sha256Receipt,
} from "../contracts.js";

describe("Areloria Genkit side-channel contract", () => {
  it("canonicalizes object key order before hashing", () => {
    const first = { z: 3, a: { y: 2, x: 1 } };
    const second = { a: { x: 1, y: 2 }, z: 3 };

    expect(canonicalizeForReceipt(first)).toBe(canonicalizeForReceipt(second));
    expect(sha256Receipt(first)).toBe(sha256Receipt(second));
  });

  it("preserves array order in receipts", () => {
    expect(sha256Receipt(["a", "b"])).not.toBe(sha256Receipt(["b", "a"]));
  });

  it.each([
    "tickId",
    "actor_id",
    "chunk-key",
    "logicalIndex",
    "receivedOrder",
    "kappa",
    "canonicalIntent",
    "intentHash",
    "snapshotHash",
    "manifestHash",
    "worldHash",
  ])("rejects authoritative payload key %s", (key) => {
    expect(() => assertSideChannelPayload({ nested: { [key]: "forbidden" } })).toThrow(
      /authoritative field/
    );
  });

  it("creates stable non-authoritative proposal receipts", () => {
    const left = createProposalEnvelope({
      proposalType: "CODE_FIX_PLAN",
      effectClass: "REPOSITORY_WRITE_PLAN",
      approval: "OWNER_REQUIRED",
      payload: {
        files: ["server/src/example.ts"],
        diagnosis: "example",
      },
    });

    const right = createProposalEnvelope({
      proposalType: "CODE_FIX_PLAN",
      effectClass: "REPOSITORY_WRITE_PLAN",
      approval: "OWNER_REQUIRED",
      payload: {
        diagnosis: "example",
        files: ["server/src/example.ts"],
      },
    });

    expect(left.authoritativeMutationAllowed).toBe(false);
    expect(left.requiresReadback).toBe(true);
    expect(left.receipt.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(left.receipt.sha256).toBe(right.receipt.sha256);
  });

  it("publishes the expected development capabilities without write authority", () => {
    expect(ARELORIA_GENKIT_FLOW_CATALOG.map((entry) => entry.capability)).toEqual([
      "npc",
      "quest_lore",
      "ui_menu",
      "database",
      "code_fix",
      "playtest",
      "asset",
    ]);

    expect(ARELORIA_GENKIT_FLOW_CATALOG.every((entry) => entry.authoritativeWrite === false)).toBe(
      true
    );
    expect(new Set(ARELORIA_GENKIT_FLOW_CATALOG.map((entry) => entry.flowName)).size).toBe(
      ARELORIA_GENKIT_FLOW_CATALOG.length
    );
  });
});
