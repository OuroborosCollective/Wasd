/**
 * PayPal REST API Service for Areloria MMORPG
 * Handles: Matrix Energy purchases, GLB Subscription, Marketplace transactions
 */

import https from "https";

const PAYPAL_BASE = process.env.PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const SECRET = process.env.PAYPAL_SECRET || "";

// ── Matrix Energy Packages ────────────────────────────────────────────────────
export const MATRIX_PACKAGES: Record<string, { energy: number; price: string; label: string; bonus: string }> = {
  "matrix_100":  { energy: 100,  price: "4.99",  label: "100 Matrix Energy",  bonus: "" },
  "matrix_500":  { energy: 500,  price: "19.99", label: "500 Matrix Energy",  bonus: "+50 Bonus" },
  "matrix_1200": { energy: 1200, price: "39.99", label: "1200 Matrix Energy", bonus: "+200 Bonus" },
  "matrix_3000": { energy: 3000, price: "79.99", label: "3000 Matrix Energy", bonus: "+600 Bonus" },
};

export const GLB_SUBSCRIPTION = {
  productId: "glb_subscription_1month",
  price: "15.00",
  label: "GLB Creator Pass – 1 Month",
  days: 30,
  description: "Upload your own 3D GLB models, place them on your land, and sell them in the marketplace.",
};

// ── HTTP helper ───────────────────────────────────────────────────────────────
function paypalRequest(method: string, path: string, body?: any, token?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : undefined;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      headers["Authorization"] = `Basic ${Buffer.from(`${CLIENT_ID}:${SECRET}`).toString("base64")}`;
    }
    if (bodyStr) headers["Content-Length"] = Buffer.byteLength(bodyStr).toString();

    const url = new URL(PAYPAL_BASE + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ raw: data, statusCode: res.statusCode });
        }
      });
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Get OAuth Token ───────────────────────────────────────────────────────────
export async function getPayPalToken(): Promise<string> {
  const body = "grant_type=client_credentials";
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${Buffer.from(`${CLIENT_ID}:${SECRET}`).toString("base64")}`,
      "Content-Length": Buffer.byteLength(body).toString(),
    };
    const url = new URL(PAYPAL_BASE + "/v1/oauth2/token");
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: "POST",
      headers,
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.access_token) resolve(parsed.access_token);
          else reject(new Error("No access_token: " + data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Create Order ──────────────────────────────────────────────────────────────
export async function createPayPalOrder(
  productId: string,
  playerId: string,
  playerName: string,
  returnUrl: string,
  cancelUrl: string
): Promise<{ orderId: string; approveUrl: string }> {
  const token = await getPayPalToken();

  let price: string;
  let description: string;

  if (productId === "glb_subscription_1month") {
    price = GLB_SUBSCRIPTION.price;
    description = GLB_SUBSCRIPTION.label;
  } else if (MATRIX_PACKAGES[productId]) {
    const pkg = MATRIX_PACKAGES[productId];
    price = pkg.price;
    description = pkg.label + (pkg.bonus ? ` (${pkg.bonus})` : "");
  } else {
    throw new Error(`Unknown product: ${productId}`);
  }

  const order = await paypalRequest("POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [{
      reference_id: `${playerId}_${productId}_${Date.now()}`,
      description: `Areloria MMORPG – ${description} for ${playerName}`,
      amount: {
        currency_code: "EUR",
        value: price,
      },
      custom_id: JSON.stringify({ playerId, productId, playerName }),
    }],
    application_context: {
      brand_name: "Rwad – Areloria MMORPG",
      locale: "de-DE",
      landing_page: "BILLING",
      user_action: "PAY_NOW",
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  }, token);

  if (!order.id) throw new Error("PayPal order creation failed: " + JSON.stringify(order));

  const approveLink = order.links?.find((l: any) => l.rel === "approve");
  return {
    orderId: order.id,
    approveUrl: approveLink?.href || "",
  };
}

// ── Capture Order ─────────────────────────────────────────────────────────────
export async function capturePayPalOrder(orderId: string): Promise<{
  success: boolean;
  playerId?: string;
  productId?: string;
  playerName?: string;
  amount?: string;
  currency?: string;
}> {
  const token = await getPayPalToken();
  const result = await paypalRequest("POST", `/v2/checkout/orders/${orderId}/capture`, {}, token);

  if (result.status !== "COMPLETED") {
    return { success: false };
  }

  const unit = result.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  const customId = unit?.reference_id || "";

  let playerId = "";
  let productId = "";
  let playerName = "";

  try {
    // custom_id is in the capture or reference_id
    const customRaw = capture?.custom_id || unit?.custom_id || customId;
    if (customRaw && customRaw.startsWith("{")) {
      const parsed = JSON.parse(customRaw);
      playerId = parsed.playerId;
      productId = parsed.productId;
      playerName = parsed.playerName;
    } else {
      // Fallback: parse from reference_id format "playerId_productId_timestamp"
      const parts = customId.split("_");
      playerId = parts[0];
      productId = parts.slice(1, -1).join("_");
    }
  } catch {}

  return {
    success: true,
    playerId,
    productId,
    playerName,
    amount: capture?.amount?.value,
    currency: capture?.amount?.currency_code,
  };
}

// ── Verify Webhook ────────────────────────────────────────────────────────────
export async function verifyPayPalWebhook(
  headers: Record<string, string>,
  body: string,
  webhookId: string
): Promise<boolean> {
  try {
    const token = await getPayPalToken();
    const result = await paypalRequest("POST", "/v1/notifications/verify-webhook-signature", {
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }, token);
    return result.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}
