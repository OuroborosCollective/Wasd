import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WatchdogLearning } from "./watchdog-learning";

describe("WatchdogLearning", () => {
    let watchdog: WatchdogLearning;

    beforeEach(() => {
        vi.useFakeTimers();
        watchdog = new WatchdogLearning();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should record violations with a timestamp", () => {
        const date = new Date(2023, 10, 10);
        vi.setSystemTime(date);

        const violation = { type: "SOME_ERROR", message: "Something went wrong" };
        watchdog.record(violation);

        const recent = watchdog.getRecentViolations(1);
        expect(recent).toHaveLength(1);
        expect(recent[0]).toMatchObject({
            ...violation,
            timestamp: date.getTime()
        });
    });

    it("should correctly identify and aggregate SCHEMA_DRIFT patterns", () => {
        const violation1 = { type: "SCHEMA_DRIFT", payload: { tableName: "users" } };
        const violation2 = { type: "SCHEMA_DRIFT", payload: { tableName: "users" } };
        const violation3 = { type: "SCHEMA_DRIFT", payload: { tableName: "orders" } };

        watchdog.record(violation1);
        watchdog.record(violation2);
        watchdog.record(violation3);

        const insights = watchdog.getInsights();
        expect(insights).toHaveLength(2);

        const userDrift = insights.find(i => i.pattern === "DRIFT_users");
        expect(userDrift).toBeDefined();
        expect(userDrift?.frequency).toBe(2);
        expect(userDrift?.suggestion).toContain("migration");

        const orderDrift = insights.find(i => i.pattern === "DRIFT_orders");
        expect(orderDrift).toBeDefined();
        expect(orderDrift?.frequency).toBe(1);
    });

    it("should correctly identify and aggregate TYPE_MISMATCH patterns", () => {
        const violation = { type: "TYPE_MISMATCH", payload: { columnName: "email" } };

        watchdog.record(violation);

        const insights = watchdog.getInsights();
        expect(insights).toHaveLength(1);
        expect(insights[0].pattern).toBe("TYPE_email");
        expect(insights[0].frequency).toBe(1);
        expect(insights[0].suggestion).toContain("TypeScript");
    });

    it("should return the last N violations via getRecentViolations", () => {
        for (let i = 0; i < 15; i++) {
            watchdog.record({ type: "TEST", id: i });
        }

        const recent = watchdog.getRecentViolations(5);
        expect(recent).toHaveLength(5);
        expect(recent[0].id).toBe(10);
        expect(recent[4].id).toBe(14);
    });

    it("should return all aggregated patterns via getInsights", () => {
        watchdog.record({ type: "SCHEMA_DRIFT", payload: { tableName: "a" } });
        watchdog.record({ type: "TYPE_MISMATCH", payload: { columnName: "b" } });

        const insights = watchdog.getInsights();
        expect(insights).toHaveLength(2);
    });
});
