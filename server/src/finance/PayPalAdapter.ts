import type { Request } from "express";
import { SovereignBillingBridge } from "../market/SovereignBillingBridge.js";

export interface PayPalCheckoutRequest {
  clientId: string;
  displayName?: string;
  credits: number;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PayPalVerificationResult {
  ok: boolean;
  transactionId: string | null;
  clientId: string | null;
  displayName: string | null;
  credits: number;
  status: string;
  message: string;
}

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || (process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for PayPal finance gateway.`);
  return value;
}

function normalizeCredits(raw: unknown): number {
  const credits = Number(raw);
  if (!Number.isFinite(credits) || credits <= 0) return 0;
  return Math.floor(credits * 1000) / 1000;
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = requireEnv("PAYPAL_CLIENT_ID");
  const secret = requireEnv("PAYPAL_SECRET");
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) throw new Error(`PayPal token request failed: ${response.status}`);
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error("PayPal token response did not include access_token.");
  return body.access_token;
}

export class PayPalAdapter {
  async createCheckoutLink(input: PayPalCheckoutRequest): Promise<{ ok: true; orderId: string; approvalUrl: string; credits: number }> {
    const credits = normalizeCredits(input.credits);
    if (!input.clientId || credits <= 0) throw new Error("clientId and positive credits are required.");
    const token = await getPayPalAccessToken();
    const euroPerCredit = Number(process.env.ARE_CREDIT_EUR_PRICE || "1");
    const amount = Math.max(1, Math.round(credits * euroPerCredit * 100) / 100).toFixed(2);
    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `are-${input.clientId}-${credits}-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: input.clientId,
          custom_id: JSON.stringify({ clientId: input.clientId, displayName: input.displayName || input.clientId, credits }),
          amount: { currency_code: process.env.PAYPAL_CURRENCY || "EUR", value: amount },
          description: `${credits} ARE-Credits`,
        }],
        application_context: {
          brand_name: "Areloria Ouroboros Collective",
          user_action: "PAY_NOW",
          return_url: input.returnUrl || process.env.PAYPAL_RETURN_URL || "https://arelorian.de/portal/?billing=success",
          cancel_url: input.cancelUrl || process.env.PAYPAL_CANCEL_URL || "https://arelorian.de/portal/?billing=cancelled",
        },
      }),
    });
    if (!response.ok) throw new Error(`PayPal order creation failed: ${response.status}`);
    const body = await response.json() as { id?: string; links?: Array<{ href: string; rel: string }> };
    const approvalUrl = body.links?.find((link) => link.rel === "approve")?.href;
    if (!body.id || !approvalUrl) throw new Error("PayPal order response missing approval link.");
    return { ok: true, orderId: body.id, approvalUrl, credits };
  }

  async verifyTransaction(transactionId: string): Promise<PayPalVerificationResult> {
    if (!transactionId) return { ok: false, transactionId: null, clientId: null, displayName: null, credits: 0, status: "missing", message: "Missing PayPal transaction id." };
    const token = await getPayPalAccessToken();
    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${encodeURIComponent(transactionId)}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!response.ok) return { ok: false, transactionId, clientId: null, displayName: null, credits: 0, status: `paypal_${response.status}`, message: "Could not verify PayPal transaction." };
    const body = await response.json() as any;
    const unit = body.purchase_units?.[0] ?? {};
    let custom: any = {};
    try { custom = unit.custom_id ? JSON.parse(unit.custom_id) : {}; } catch { custom = {}; }
    const status = String(body.status || "UNKNOWN");
    const captureStatus = String(unit.payments?.captures?.[0]?.status || status);
    const ok = status === "COMPLETED" || captureStatus === "COMPLETED";
    return {
      ok,
      transactionId,
      clientId: String(custom.clientId || unit.reference_id || ""),
      displayName: String(custom.displayName || custom.clientId || unit.reference_id || ""),
      credits: normalizeCredits(custom.credits),
      status: captureStatus,
      message: ok ? "PayPal transaction verified." : `PayPal transaction not completed: ${captureStatus}`,
    };
  }

  async handleWebhook(req: Request): Promise<PayPalVerificationResult & { credited?: boolean; account?: unknown }> {
    const event = req.body ?? {};
    const eventType = String(event.event_type || "");
    const transactionId = String(event.resource?.supplementary_data?.related_ids?.order_id || event.resource?.id || event.resource?.invoice_id || "");
    if (!eventType.includes("CHECKOUT") && !eventType.includes("PAYMENT")) {
      return { ok: false, transactionId: transactionId || null, clientId: null, displayName: null, credits: 0, status: eventType || "ignored", message: "Webhook event ignored." };
    }
    const verified = await this.verifyTransaction(transactionId);
    if (!verified.ok || !verified.clientId || verified.credits <= 0) return verified;
    const account = SovereignBillingBridge.addCredits(verified.clientId, verified.credits, verified.displayName || verified.clientId);
    return {
      ...verified,
      credited: true,
      account,
      message: "Architekt, externe Ressourcen wurden erfolgreich in Kausalitäts-Credits umgewandelt. Systemstatus: Operational.",
    };
  }
}

export const paypalAdapter = new PayPalAdapter();
