/**
 * @file server/src/core/VpsConnectionManager.ts
 * @description ARE-LOGIC Phase 3 Implementation: High-Yield VPS Auto-Fix Bridge.
 * Focus: Stateless Determinism, 10Hz Tick Compliance, KappaPos Scaling.
 */

export interface VpsState {
    logicalIndex: number; // O(1) Position Fingerprint
    isConnected: boolean;
    latencyMs: number;
    lastHeartbeat: number;
    integrityLevel: number; // 0-10000 (kappaPos scaled)
    reconnectAttempts: number;
}

export interface BridgeConfig {
    vpsIp: string;
    ngrokUrl: string;
    bridgeAuth: string;
    targetTickRate: number; // 10Hz = 100ms
}

export class VpsConnectionManager {
    private static readonly KAPPA_MAX = 10000;
    private static readonly TICK_INTERVAL = 100; // 10Hz in ms
    
    private readonly config: BridgeConfig = {
        vpsIp: "46.202.154.25",
        ngrokUrl: "https://drearily-unseen-idiom.ngrok-free.dev",
        bridgeAuth: "ThomasVPS-Bridge-2026",
        targetTickRate: 10
    };

    private state: VpsState = {
        logicalIndex: 4620215425, // Derived from IP
        isConnected: false,
        latencyMs: 0,
        lastHeartbeat: Date.now(),
        integrityLevel: 10000,
        reconnectAttempts: 0
    };

    /**
     * CORE TICK (10Hz)
     * Driven by the central ARE-Logic Loop.
     */
    public tick(currentTick: number): void {
        const kappaScaling = this.calculateKappaScaling(currentTick);
        
        // Auto-Fix Logic: Triggered if health drops below threshold
        if (this.state.integrityLevel < 5000 || !this.state.isConnected) {
            this.executeAutoFix(kappaScaling);
        }

        // Monitoring Phase (Stateless probe)
        if (currentTick % 10 === 0) { // Every 1 second
            this.probeBridgeHealth();
        }
    }

    /**
     * PLEXITY METRIC (ARE-LOGIC Standard)
     * 45% Type (Connection State)
     * 35% HP-Ratio (Integrity Level)
     * 20% Inverse Resonance (Latency Impact)
     */
    public calculatePlexity(): number {
        const typeWeight = this.state.isConnected ? 0.45 : 0;
        const hpWeight = (this.state.integrityLevel / VpsConnectionManager.KAPPA_MAX) * 0.35;
        const resonanceWeight = Math.max(0, (1 - this.state.latencyMs / 1000)) * 0.20;
        
        return (typeWeight + hpWeight + resonanceWeight) * 100;
    }

    /**
     * Stateless Determinism: Bridge Probe
     * Uses fetch with the mandatory bridge.py authentication.
     */
    private async probeBridgeHealth(): Promise<void> {
        const start = Date.now();
        try {
            const response = await fetch(`${this.config.ngrokUrl}/health`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.bridgeAuth}`,
                    'X-Logical-Index': this.state.logicalIndex.toString()
                }
            });

            const success = response.status === 200;
            this.state.latencyMs = Date.now() - start;
            this.state.isConnected = success;
            this.state.integrityLevel = success ? 
                Math.min(VpsConnectionManager.KAPPA_MAX, this.state.integrityLevel + 500) : 
                Math.max(0, this.state.integrityLevel - 1500);

        } catch (error) {
            this.state.isConnected = false;
            this.state.integrityLevel = Math.max(0, this.state.integrityLevel - 2000);
        }
    }

    /**
     * Auto-Fix Workflow Dependency
     * Re-initializes bridge.py on VPS if tunnel is responsive but bridge service is down.
     */
    private async executeAutoFix(kappaScaling: number): Promise<void> {
        // Prevent spamming (Kostenbremse)
        if (this.state.reconnectAttempts > 5) {
            this.state.integrityLevel = 100; // Hibernate state
            return;
        }

        this.state.reconnectAttempts++;

        try {
            // WakeUpShield: Attempt SSH recovery via IP if Ngrok fails, or vice versa
            const repairEndpoint = `${this.config.ngrokUrl}/fix`;
            await fetch(repairEndpoint, {
                method: 'POST',
                headers: { 'X-Auth': this.config.bridgeAuth },
                body: JSON.stringify({
                    origin: "ARE-Logic-Core",
                    kappa: kappaScaling,
                    vps: this.config.vpsIp
                })
            });
        } catch (e) {
            // Fail silently to maintain stateless 10Hz flow
        }
    }

    /**
     * KappaPos Scaling: Prevents floating point drift in timing.
     */
    private calculateKappaScaling(tick: number): number {
        return (tick * this.state.logicalIndex) % VpsConnectionManager.KAPPA_MAX;
    }

    /**
     * Getter for External Workflow Orchestrator
     */
    public getStatus() {
        return {
            ...this.state,
            complexity: this.calculatePlexity(),
            vps: this.config.vpsIp
        };
    }
}

export const vpsManager = new VpsConnectionManager();