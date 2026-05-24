import { describe, it, expect, vi, beforeEach } from "vitest";
import { WatchdogCascadeMonitor } from "../../../backend/src/core/watchdog-cascade.js";
import { WatchdogEmitter } from "../../../backend/src/core/watchdog-emitter.js";

// Mock the WatchdogEmitter
vi.mock("../../../backend/src/core/watchdog-emitter.js", () => {
    return {
        WatchdogEmitter: vi.fn().mockImplementation(function() {
            return {
                emit: vi.fn()
            };
        })
    };
});

describe("WatchdogCascadeMonitor", () => {
    let monitor: WatchdogCascadeMonitor;
    let mockEmitter: any;

    beforeEach(() => {
        vi.clearAllMocks();
        monitor = new WatchdogCascadeMonitor("ws://test-url");
        mockEmitter = (WatchdogEmitter as any).mock.results[0].value;
    });

    it("should initialize with the provided URL", () => {
        expect(WatchdogEmitter).toHaveBeenCalledWith("ws://test-url");
    });

    it("should emit CASCADE_WARNING when cascade is active", () => {
        monitor.monitorCascade(true);

        expect(mockEmitter.emit).toHaveBeenCalledWith(
            "CASCADE_WARNING",
            { message: "Resonance Cascade detected. Threat levels inverted." },
            "HIGH",
            "CASCADE_MONITOR"
        );
    });

    it("should NOT emit anything when cascade is NOT active", () => {
        monitor.monitorCascade(false);

        expect(mockEmitter.emit).not.toHaveBeenCalled();
    });
});
