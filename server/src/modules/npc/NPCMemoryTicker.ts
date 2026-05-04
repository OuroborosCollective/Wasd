// @ts-nocheck
import { NPCMemoryCache } from "./NPCMemoryCache";
import { serverTickEmitter } from "../../core/ServerTickEmitter";

export class NPCMemoryTicker {
    private static isProcessing: boolean = false;
    private static readonly FLUSH_INTERVAL: number = 300;

    /**
     * Initialisiert den Ticker und abonniert das Tick-Event des Servers.
     */
    public static register(): void {
        serverTickEmitter.on("tick", (currentTick: number) => {
            NPCMemoryTicker.handleTick(currentTick);
        });
    }

    /**
     * Verarbeitet den aktuellen Tick.
     * Prüft das Intervall mittels Modulo und stellt sicher, dass kein paralleler Flush läuft.
     * @param currentTick Der aktuelle Tick-Zähler des Servers.
     */
    private static async handleTick(currentTick: number): Promise<void> {
        if (currentTick % NPCMemoryTicker.FLUSH_INTERVAL !== 0) {
            return;
        }

        if (NPCMemoryTicker.isProcessing) {
            return;
        }

        NPCMemoryTicker.isProcessing = true;

        try {
            await NPCMemoryCache.flushToDatabase();
        } catch (error) {
            console.error("[NPCMemoryTicker] Error during memory flush:", error);
        } finally {
            NPCMemoryTicker.isProcessing = false;
        }
    }
}