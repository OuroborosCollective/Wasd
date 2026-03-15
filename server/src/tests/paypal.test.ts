import { describe, it, expect, vi, beforeEach } from "vitest";
import https from "https";
import { capturePayPalOrder, getPayPalToken, verifyPayPalWebhook } from "../modules/payment/PayPalService.js";

vi.mock("https", () => ({
  default: {
    request: vi.fn(),
  },
}));

describe("PayPalService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("paypalRequest JSON parsing fallback", () => {
    it("returns raw data and statusCode when JSON parsing fails", async () => {
      // capturePayPalOrder calls getPayPalToken, then paypalRequest

      let requestCount = 0;

      // Mock https.request
      (https.request as any).mockImplementation((options: any, cb: any) => {
        requestCount++;

        const reqObj = {
          on: vi.fn(),
          write: vi.fn(),
          end: vi.fn(),
        };

        const resObj = {
          statusCode: requestCount === 1 ? 200 : 502,
          on: (event: string, eventCb: any) => {
            if (event === "data") {
              if (requestCount === 1) {
                // First request: getPayPalToken
                eventCb(JSON.stringify({ access_token: "mock_token" }));
              } else {
                // Second request: paypalRequest returning invalid JSON
                eventCb("<html>Bad Gateway</html>");
              }
            } else if (event === "end") {
              eventCb();
            }
          },
        };

        if (cb) {
          cb(resObj);
        }

        return reqObj;
      });

      // Call the function
      const result = await capturePayPalOrder("test_order_id");

      expect(result).toEqual({ success: false });
      expect(https.request).toHaveBeenCalledTimes(2);
    });

    it("verifies getPayPalToken rejects on invalid JSON", async () => {
      (https.request as any).mockImplementation((options: any, cb: any) => {
        const reqObj = {
          on: vi.fn(),
          write: vi.fn(),
          end: vi.fn(),
        };

        const resObj = {
          statusCode: 500,
          on: (event: string, eventCb: any) => {
            if (event === "data") {
              eventCb("<html>Internal Server Error</html>");
            } else if (event === "end") {
              eventCb();
            }
          },
        };

        if (cb) cb(resObj);
        return reqObj;
      });

      await expect(getPayPalToken()).rejects.toThrow();
    });

    it("verifyPayPalWebhook returns false when JSON parsing fails in verification", async () => {
      let requestCount = 0;
      (https.request as any).mockImplementation((options: any, cb: any) => {
        requestCount++;

        const reqObj = {
          on: vi.fn(),
          write: vi.fn(),
          end: vi.fn(),
        };

        const resObj = {
          statusCode: requestCount === 1 ? 200 : 500,
          on: (event: string, eventCb: any) => {
            if (event === "data") {
              if (requestCount === 1) {
                eventCb(JSON.stringify({ access_token: "mock_token" }));
              } else {
                // Return invalid JSON here
                eventCb("<html>Bad Gateway</html>");
              }
            } else if (event === "end") {
              eventCb();
            }
          },
        };

        if (cb) cb(resObj);
        return reqObj;
      });

      const headers = {
        "paypal-auth-algo": "algo",
        "paypal-cert-url": "url",
        "paypal-transmission-id": "id",
        "paypal-transmission-sig": "sig",
        "paypal-transmission-time": "time",
      };

      const body = JSON.stringify({ event: "PAYMENT.CAPTURE.COMPLETED" });

      const result = await verifyPayPalWebhook(headers, body, "webhook_id");
      expect(result).toBe(false);
      expect(https.request).toHaveBeenCalledTimes(2);
    });
  });
});
