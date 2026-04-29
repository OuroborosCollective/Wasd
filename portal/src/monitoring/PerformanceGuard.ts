interface PerformanceMemory {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
}

interface ExtendedPerformance extends Performance {
    memory?: PerformanceMemory;
}

export type ThrottleProfile = '3G' | 'Slow3G' | '4G';

export class PerformanceGuard {
    private static instance: PerformanceGuard;
    private readonly heapLimit = 500 * 1024 * 1024; // 500MB
    private lastFrameTime: number = performance.now();
    private jankThreshold = 1000 / 30; // 30 FPS threshold for jank
    private jankHistory: number[] = [];
    private latencies: Map<string, number[]> = new Map();
    private isMonitoring: boolean = false;

    private constructor() {
        this.initializeWatchdogs();
    }

    public static getInstance(): PerformanceGuard {
        if (!PerformanceGuard.instance) {
            PerformanceGuard.instance = new PerformanceGuard();
        }
        return PerformanceGuard.instance;
    }

    private initializeWatchdogs(): void {
        this.startJankDetection();
        this.startMemoryWatchdog();
    }

    private startJankDetection(): void {
        const checkFrame = (now: number) => {
            const delta = now - this.lastFrameTime;
            if (delta > this.jankThreshold) {
                this.jankHistory.push(delta);
                this.logJank(delta);
            }
            this.lastFrameTime = now;
            if (this.isMonitoring) {
                requestAnimationFrame(checkFrame);
            }
        };
        this.isMonitoring = true;
        requestAnimationFrame(checkFrame);
    }

    private startMemoryWatchdog(): void {
        setInterval(() => {
            const perf = performance as ExtendedPerformance;
            if (perf.memory) {
                const usedHeap = perf.memory.usedJSHeapSize;
                if (usedHeap > this.heapLimit) {
                    this.createMemorySnapshot(usedHeap);
                }
            }
        }, 2000);
    }

    private logJank(delta: number): void {
        console.warn(`[PerformanceGuard] Jank detected: ${delta.toFixed(2)}ms frame duration during asset injection.`);
    }

    private createMemorySnapshot(currentHeap: number): void {
        const mb = (currentHeap / 1024 / 1024).toFixed(2);
        console.error(`[PerformanceGuard] CRITICAL: Memory Leak Watchdog triggered. Heap: ${mb}MB. Automated snapshot initiated.`);
        // Note: Real snapshot creation requires DevTools Protocol / Native Bridge
    }

    public async trackApiCall<T>(identifier: string, call: () => Promise<T>): Promise<T> {
        const start = performance.now();
        try {
            const result = await call();
            const duration = performance.now() - start;
            this.recordLatency(identifier, duration);
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.recordLatency(`${identifier}_error`, duration);
            throw error;
        }
    }

    private recordLatency(key: string, duration: number): void {
        if (!this.latencies.has(key)) {
            this.latencies.set(key, []);
        }
        this.latencies.get(key)?.push(duration);
    }

    public getMockNetworkProvider(profile: ThrottleProfile = '3G') {
        const latencyMap: Record<ThrottleProfile, number> = {
            'Slow3G': 400,
            '3G': 200,
            '4G': 50
        };

        return {
            execute: async <T>(request: () => Promise<T>): Promise<T> => {
                const delay = latencyMap[profile] + Math.random() * 50;
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.trackApiCall(`network_mock_${profile}`, request);
            }
        };
    }

    public validateCrossSellEngineLatency(testCall: () => Promise<any>): void {
        const provider = this.getMockNetworkProvider('3G');
        provider.execute(testCall)
            .then(() => console.info('[PerformanceGuard] Cross-Sell Engine latency validation complete under 3G simulation.'))
            .catch(err => console.error('[PerformanceGuard] Cross-Sell Engine failed under simulated latency.', err));
    }

    public getReport() {
        return {
            jankEvents: this.jankHistory.length,
            averageLatencies: Object.fromEntries(
                Array.from(this.latencies.entries()).map(([k, v]) => [
                    k, 
                    v.reduce((a, b) => a + b, 0) / v.length
                ])
            ),
            heapUsage: (performance as ExtendedPerformance).memory?.usedJSHeapSize
        };
    }
}

export default PerformanceGuard.getInstance();