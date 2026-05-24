import { describe, it, expect, vi, beforeEach } from "vitest";
import { WatchdogEmitter } from "../../../backend/src/core/watchdog-emitter.js";
import { AxiomaticEventBus } from "../../../backend/src/core/axiomatic-event-bus.js";

// We'll mock WebSocket later if needed, but let's try to fix the test logic first.
// The issue is that the constructor tries to connect immediately.

describe("WatchdogEmitter", () => {
    let emitter: WatchdogEmitter;
    let mockBus: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockBus = AxiomaticEventBus.getInstance();
        emitter = new WatchdogEmitter("ws://localhost:9090");
    });

    it("should publish to AxiomaticEventBus when emit is called", () => {
        emitter.emit("TEST_EVENT", { data: "test" }, "HIGH", "TEST_SOURCE");

        expect(mockBus.publish).toHaveBeenCalledWith(
            "TEST_EVENT",
            expect.objectContaining({
                data: "test",
                severity: "HIGH",
                source: "TEST_SOURCE"
            })
        );
    });

    it("should send via WebSocket when ready", () => {
        const mockWs = {
            send: vi.fn(),
            readyState: 1 // WebSocket.OPEN
        };
        (emitter as any).ws = mockWs;

        emitter.emit("TEST_EVENT", { data: "test" });

        expect(mockWs.send).toHaveBeenCalled();
        const sentData = JSON.parse(mockWs.send.mock.calls[0][0]);
        expect(sentData.type).toBe("TEST_EVENT");
    });

    it("should trigger instability alert", () => {
        emitter.triggerInstabilityAlert("Memory leak detected");

        expect(mockBus.publish).toHaveBeenCalledWith(
            "WATCHDOG_ALERT",
            expect.objectContaining({
                reason: "Memory leak detected",
                systemState: "UNSTABLE"
            })
        );
    });

    it("should notify local subscribers", () => {
        const listener = vi.fn();
        emitter.subscribe(listener);

        emitter.emit("LOCAL_EVENT", { foo: "bar" });

        expect(listener).toHaveBeenCalledWith(expect.objectContaining({
            type: "LOCAL_EVENT",
            payload: { foo: "bar" }
        }));
    });
});

// Mock AxiomaticEventBus
vi.mock("../../../backend/src/core/axiomatic-event-bus.js", () => {
    return {
        AxiomaticEventBus: {
            getInstance: vi.fn().mockReturnValue({
                publish: vi.fn()
            })
        }
    };
});
