import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import https from "https";
import EventEmitter from "events";
import {
  getPayPalToken,
  createPayPalOrder,
  capturePayPalOrder,
  verifyPayPalWebhook,
  MATRIX_PACKAGES,
  GLB_SUBSCRIPTION
} from "../modules/payment/PayPalService.js";

vi.mock("https", () => {
  return {
    default: {
      request: vi.fn(),
    },
  };
});

describe("PayPalService", () => {
  let requestMock: any;

  beforeEach(() => {
    process.env.PAYPAL_CLIENT_ID = "test_client_id";
    process.env.PAYPAL_SECRET = "test_secret";

    requestMock = vi.fn();
    (https.request as any) = requestMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function mockHttpsResponses(responses: Array<{ statusCode: number; data: any; shouldReject?: boolean }>) {
    let callCount = 0;
    requestMock.mockImplementation((options: any, callback: any) => {
      const response = responses[callCount++];
      const req = new EventEmitter() as any;
      req.write = vi.fn();
      req.end = vi.fn(() => {
        if (response.shouldReject) {
          req.emit("error", new Error("Network error"));
          return;
        }
        const res = new EventEmitter() as any;
        res.statusCode = response.statusCode;
        if (callback) callback(res);
        res.emit("data", typeof response.data === "string" ? response.data : JSON.stringify(response.data));
        res.emit("end");
      });
      return req;
    });
  }

  describe("getPayPalToken", () => {
    it("should return an access token on success", async () => {
      mockHttpsResponses([{ statusCode: 200, data: { access_token: "mock_token" } }]);
      const token = await getPayPalToken();
      expect(token).toBe("mock_token");
      expect(requestMock).toHaveBeenCalled();
      const options = requestMock.mock.calls[0][0];
      expect(options.method).toBe("POST");
      expect(options.path).toBe("/v1/oauth2/token");
    });

    it("should throw an error on failure", async () => {
      mockHttpsResponses([{ statusCode: 400, data: { error: "invalid_client" } }]);
      await expect(getPayPalToken()).rejects.toThrow();
    });

    it("should throw on network error", async () => {
      mockHttpsResponses([{ statusCode: 0, data: {}, shouldReject: true }]);
      await expect(getPayPalToken()).rejects.toThrow("Network error");
    });
  });

  describe("createPayPalOrder", () => {
    it("should create an order for GLB subscription", async () => {
      mockHttpsResponses([
        { statusCode: 200, data: { access_token: "mock_token" } },
        { statusCode: 200, data: { id: "mock_order_id", links: [{ rel: "approve", href: "https://approve.url" }] } }
      ]);
      const result = await createPayPalOrder("glb_subscription_1month", "player1", "Alice", "http://return", "http://cancel");
      expect(result.orderId).toBe("mock_order_id");
      expect(result.approveUrl).toBe("https://approve.url");
    });

    it("should create an order for Matrix Energy package", async () => {
      mockHttpsResponses([
        { statusCode: 200, data: { access_token: "mock_token" } },
        { statusCode: 200, data: { id: "mock_order_id", links: [{ rel: "approve", href: "https://approve.url" }] } }
      ]);
      const result = await createPayPalOrder("matrix_100", "player1", "Alice", "http://return", "http://cancel");
      expect(result.orderId).toBe("mock_order_id");
    });

    it("should throw an error for unknown product", async () => {
      mockHttpsResponses([
        { statusCode: 200, data: { access_token: "mock_token" } }
      ]);
      await expect(createPayPalOrder("unknown_product", "player1", "Alice", "http://return", "http://cancel")).rejects.toThrow("Unknown product");
    });

    it("should throw an error if order creation fails without an id", async () => {
      mockHttpsResponses([
        { statusCode: 200, data: { access_token: "mock_token" } },
        { statusCode: 400, data: { error: "invalid_request" } }
      ]);
      await expect(createPayPalOrder("matrix_100", "player1", "Alice", "http://return", "http://cancel")).rejects.toThrow("PayPal order creation failed");
    });
  });

  describe("capturePayPalOrder", () => {
    it("should capture order successfully and parse custom_id from JSON", async () => {
      mockHttpsResponses([
        { statusCode: 200, data: { access_token: "mock_token" } },
        { statusCode: 200, data: {
            status: "COMPLETED",
            purchase_units: [{
              reference_id: "ref123",
              custom_id: JSON.stringify({ playerId: "player1", productId: "matrix_100", playerName: "Alice" }),
              payments: {
                captures: [{
                  amount: { value: "4.99", currency_code: "EUR" }
                }]
              }
            }]
          }
        }
      ]);
      const result = await capturePayPalOrder("mock_order_id");
      expect(result.success).toBe(true);
      expect(result.playerId).toBe("player1");
      expect(result.productId).toBe("matrix_100");
      expect(result.playerName).toBe("Alice");
      expect(result.amount).toBe("4.99");
      expect(result.currency).toBe("EUR");
    });

    it("should fallback to parsing reference_id if custom_id is not JSON", async () => {
      mockHttpsResponses([
        { statusCode: 200, data: { access_token: "mock_token" } },
        { statusCode: 200, data: {
            status: "COMPLETED",
            purchase_units: [{
              reference_id: "player2_matrix_500_123456789",
              payments: {
                captures: [{
                  amount: { value: "19.99", currency_code: "EUR" }
                }]
              }
            }]
          }
        }
      ]);
      const result = await capturePayPalOrder("mock_order_id");
      expect(result.success).toBe(true);
      expect(result.playerId).toBe("player2");
      expect(result.productId).toBe("matrix_500");
    });

    it("should return false if status is not COMPLETED", async () => {
      mockHttpsResponses([
        { statusCode: 200, data: { access_token: "mock_token" } },
        { statusCode: 200, data: { status: "PENDING" } }
      ]);
      const result = await capturePayPalOrder("mock_order_id");
      expect(result.success).toBe(false);
    });
  });

  describe("verifyPayPalWebhook", () => {
    it("should return true if verification is SUCCESS", async () => {
      mockHttpsResponses([
        { statusCode: 200, data: { access_token: "mock_token" } },
        { statusCode: 200, data: { verification_status: "SUCCESS" } }
      ]);
      const result = await verifyPayPalWebhook(
        { "paypal-auth-algo": "algo", "paypal-cert-url": "url", "paypal-transmission-id": "id", "paypal-transmission-sig": "sig", "paypal-transmission-time": "time" },
        JSON.stringify({ event: "test" }),
        "webhook_id"
      );
      expect(result).toBe(true);
    });

    it("should return false if verification is not SUCCESS", async () => {
      mockHttpsResponses([
        { statusCode: 200, data: { access_token: "mock_token" } },
        { statusCode: 200, data: { verification_status: "FAILURE" } }
      ]);
      const result = await verifyPayPalWebhook({}, "{}", "webhook_id");
      expect(result).toBe(false);
    });

    it("should return false on network error during verification", async () => {
      mockHttpsResponses([
        { statusCode: 200, data: { access_token: "mock_token" } },
        { statusCode: 0, data: {}, shouldReject: true }
      ]);
      const result = await verifyPayPalWebhook({}, "{}", "webhook_id");
      expect(result).toBe(false);
    });
  });
});
