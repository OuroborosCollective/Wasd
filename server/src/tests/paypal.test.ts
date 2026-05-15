import type { Request } from "express";
import { describe, it, expect, vi } from "vitest";
import { PayPalAdapter } from "../finance/PayPalAdapter.js";
import { sovereignMarket } from "../market/SovereignMarket.js";

// Mock the PayPal SDK
vi.mock("@paypal/checkout-server-sdk", () => {
  return {
    core: {
      PayPalHttpClient: vi.fn(),
      SandboxEnvironment: vi.fn(),
    },
    orders: {
      OrdersCreateRequest: vi.fn(() => ({ requestBody: vi.fn() })),
      OrdersCaptureRequest: vi.fn(),
    },
  };
});

describe("PayPalAdapter", () => {
  it("credits a completed PayPal transaction only once across duplicate webhooks", async () => {
    const adapter = new PayPalAdapter();
    const clientId = "paypal-idempotency-client";
    const transactionId = "ORDER-IDEMPOTENCY-001";
    const request = {
      body: {
        event_type: "CHECKOUT.ORDER.APPROVED",
        resource: { id: transactionId },
      },
    } as Request;

    vi.spyOn(adapter, "verifyTransaction").mockResolvedValue({
      ok: true,
      transactionId,
      clientId,
      displayName: "PayPal Idempotency Client",
      credits: 5,
      status: "COMPLETED",
      message: "PayPal transaction verified.",
    });

    const first = await adapter.handleWebhook(request);
    const second = await adapter.handleWebhook(request);
    const account = sovereignMarket.getStatus().accounts.find((candidate) => candidate.displayName === "PayPal Idempotency Client");

    expect(first.credited).toBe(true);
    expect(second.credited).toBe(false);
    expect(second.message).toBe("PayPal transaction already credited.");
    expect(account?.credits).toBe(255);
  });
});
