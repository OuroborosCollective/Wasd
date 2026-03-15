import { describe, it, expect, vi, beforeEach } from "vitest";
import https from "https";
import EventEmitter from "events";
import { capturePayPalOrder } from "../modules/payment/PayPalService.js";

// Mock the https module
vi.mock("https");

describe("PayPalService - capturePayPalOrder", () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockResponse = new EventEmitter();
    (mockResponse as any).statusCode = 200;

    mockRequest = new EventEmitter();
    mockRequest.write = vi.fn();
    mockRequest.end = vi.fn(() => {
      // Check which URL is being requested to mock properly
      if (mockRequest.isTokenRequest) {
        mockResponse.emit("data", JSON.stringify({ access_token: "fake-token" }));
      } else {
        // Capture order request
        mockResponse.emit("data", JSON.stringify(mockResponse.mockData || { status: "COMPLETED" }));
      }
      mockResponse.emit("end");
    });

    (https.request as any).mockImplementation((options: any, callback: any) => {
      // Determine if it's the token request or capture request
      mockRequest.isTokenRequest = options.path === "/v1/oauth2/token";

      // Store the callback so we can provide our mock response
      if (callback) {
        // Run it immediately
        callback(mockResponse);
      }
      return mockRequest;
    });
  });

  it("should capture order successfully and parse custom_id as valid JSON", async () => {
    const customData = {
      playerId: "player123",
      productId: "matrix_100",
      playerName: "Hero"
    };

    const mockOrderResponse = {
      status: "COMPLETED",
      purchase_units: [
        {
          reference_id: "player123_matrix_100_1680000000",
          custom_id: JSON.stringify(customData),
          payments: {
            captures: [
              {
                amount: { value: "4.99", currency_code: "EUR" }
              }
            ]
          }
        }
      ]
    };

    mockResponse.mockData = mockOrderResponse;

    const result = await capturePayPalOrder("order_123");

    expect(result.success).toBe(true);
    expect(result.playerId).toBe("player123");
    expect(result.productId).toBe("matrix_100");
    expect(result.playerName).toBe("Hero");
    expect(result.amount).toBe("4.99");
    expect(result.currency).toBe("EUR");
  });

  it("should handle malformed JSON custom_id silently (catch block) without throwing unhandled exceptions", async () => {
    // Malformed JSON string that starts with '{' to trigger the JSON.parse block
    const malformedJson = "{ \"playerId\": \"player123\", \"productId\": \"matrix_100\", \"playerName\": \"Hero\" ";

    const mockOrderResponse = {
      status: "COMPLETED",
      purchase_units: [
        {
          reference_id: "player456_matrix_500_1680000000",
          custom_id: malformedJson,
          payments: {
            captures: [
              {
                amount: { value: "19.99", currency_code: "EUR" }
              }
            ]
          }
        }
      ]
    };

    mockResponse.mockData = mockOrderResponse;

    const result = await capturePayPalOrder("order_123");

    expect(result.success).toBe(true);
    // Because JSON parsing fails, the catch block is hit. The variables playerId, productId, playerName are not updated.
    expect(result.playerId).toBe("");
    expect(result.productId).toBe("");
    expect(result.playerName).toBe("");

    expect(result.amount).toBe("19.99");
    expect(result.currency).toBe("EUR");
  });

  it("should handle fallback logic correctly when custom_id is undefined or not JSON", async () => {
    const mockOrderResponse = {
      status: "COMPLETED",
      purchase_units: [
        {
          // format "playerId_productId_timestamp"
          reference_id: "player456_matrix_500_1680000000",
          // no custom_id here
          payments: {
            captures: [
              {
                amount: { value: "19.99", currency_code: "EUR" }
              }
            ]
          }
        }
      ]
    };

    mockResponse.mockData = mockOrderResponse;

    const result = await capturePayPalOrder("order_123");

    expect(result.success).toBe(true);
    // Because customRaw is missing or does not start with '{', it goes to the 'else' block
    // where the fallback logic operates.
    expect(result.playerId).toBe("player456");
    expect(result.productId).toBe("matrix_500");
    expect(result.playerName).toBe("");

    expect(result.amount).toBe("19.99");
    expect(result.currency).toBe("EUR");
  });

  it("should return success: false if order is not COMPLETED", async () => {
    mockResponse.mockData = { status: "PENDING" };

    const result = await capturePayPalOrder("order_123");

    expect(result.success).toBe(false);

  });
});
