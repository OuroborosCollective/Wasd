export class WatchdogLearning {
    private history: any[] = [];

    public record(violation: any): void {
        this.history.push({
            ...violation,
            timestamp: new Date()
        });
    }

    public getInsights(): any {
        return {
            totalViolations: this.history.length,
            lastViolation: this.history[this.history.length - 1]
        };
    }
}
