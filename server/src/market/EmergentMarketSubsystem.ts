import { createHash } from "crypto";

interface MarketStats {
    volume: number;
    volatility: number;
    liquidity: number;
    stateHash: string;
    timestamp: number;
}

interface GatewayTick {
    timestamp: number;
    price: number;
    sequence: number;
    entropy: string;
}

/**
 * AREStateCompiler
 * Calculates deterministic state transitions based on prior cryptographic state
 * and incoming gateway telemetry.
 */
class AREStateCompiler {
    public static compile(prevStateHash: string, tick: GatewayTick): string {
        const payload = prevStateHash + tick.timestamp + tick.price + tick.sequence + tick.entropy;
        return createHash("sha256").update(payload).digest("hex");
    }

    public static deriveKappa(hash: string): number {
        const slice = hash.substring(0, 16);
        const decimalValue = BigInt("0x" + slice);
        const maxUint64 = BigInt("0xffffffffffffffff");
        return Number(decimalValue) / Number(maxUint64);
    }

    public static deriveStats(hash: string, currentStats: MarketStats, tick: GatewayTick): MarketStats {
        const volSegment = parseInt(hash.substring(16, 24), 16) / 0xffffffff;
        const liqSegment = parseInt(hash.substring(24, 32), 16) / 0xffffffff;

        return {
            volume: currentStats.volume + (volSegment * 100),
            volatility: volSegment,
            liquidity: currentStats.liquidity + (liqSegment - 0.5) * 50,
            stateHash: hash,
            timestamp: tick.timestamp
        };
    }
}

/**
 * EmergentMarketSubsystem
 * Manages the 10Hz main loop and state evolution.
 */
export class EmergentMarketSubsystem {
    private loopInterval: NodeJS.Timeout | null = null;
    private lastStateHash: string;
    private kappaPos: number = 0.5;
    private marketStats: MarketStats;
    private lastProcessedSequence: number = -1;
    private pendingTick: GatewayTick | null = null;

    constructor() {
        this.lastStateHash = createHash("sha256").update("GENESIS_SEED").digest("hex");
        this.marketStats = {
            volume: 0,
            volatility: 0,
            liquidity: 10000,
            stateHash: this.lastStateHash,
            timestamp: 0
        };
    }

    /**
     * Starts the 10Hz (100ms) Main Loop
     */
    public start(): void {
        if (this.loopInterval) return;
        
        this.loopInterval = setInterval(() => {
            this.mainLoopTick();
        }, 100);
    }

    /**
     * Stops the subsystem execution
     */
    public stop(): void {
        if (this.loopInterval) {
            clearInterval(this.loopInterval);
            this.loopInterval = null;
        }
    }

    /**
     * Ingests data from the Gateway
     */
    public injectGatewayTick(tick: GatewayTick): void {
        this.pendingTick = tick;
    }

    /**
     * The 10Hz Core Logic
     */
    private mainLoopTick(): void {
        const tick = this.pendingTick || this.generateIdleTick();
        const nextHash = AREStateCompiler.compile(this.lastStateHash, tick);
        this.kappaPos = AREStateCompiler.deriveKappa(nextHash);
        this.marketStats = AREStateCompiler.deriveStats(nextHash, this.marketStats, tick);
        this.lastStateHash = nextHash;
        this.lastProcessedSequence = tick.sequence;

        if (this.pendingTick && this.pendingTick.sequence === tick.sequence) {
            this.pendingTick = null;
        }

        this.broadcastState();
    }

    private generateIdleTick(): GatewayTick {
        const sequence = this.lastProcessedSequence + 1;
        const entropy = createHash("sha256")
            .update(`${this.lastStateHash}:idle:${sequence}`)
            .digest("hex");
        return {
            timestamp: sequence,
            price: 0,
            sequence,
            entropy
        };
    }

    private broadcastState(): void {
        // Logic for emitting state to other subsystems or clients
        // Defined here as a placeholder for internal event bus integration
    }

    public getContext() {
        return {
            kappaPos: this.kappaPos,
            stats: this.marketStats,
            hash: this.lastStateHash,
            sequence: this.lastProcessedSequence
        };
    }
}

// Execution entry point if needed for standalone testing
const marketSubsystem = new EmergentMarketSubsystem();
marketSubsystem.start();
