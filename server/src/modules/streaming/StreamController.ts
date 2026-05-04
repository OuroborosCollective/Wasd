// @ts-nocheck
import { Request, Response } from 'express';

export enum StreamStatus {
    IDLE = 'idle',
    PENDING = 'pending',
    ACTIVE = 'active',
    ERROR = 'error'
}

export enum StartMode {
    NPC_AUTO = 'npc_auto_start',
    MANUAL = 'manual_start'
}

interface StreamMetadata {
    streamId: string;
    streamKey: string;
    mode: StartMode;
}

export class StreamController {
    private streamService: any; 
    private mediaServerProvider: any;

    constructor(streamService: any, mediaServerProvider: any) {
        this.streamService = streamService;
        this.mediaServerProvider = mediaServerProvider;
    }

    /**
     * Initialisiert den Stream-Prozess basierend auf der Start-Methode.
     * Validiert den Stream-Key bevor Signale an das Frontend gesendet werden.
     */
    public async handleStreamStart(req: Request, res: Response): Promise<Response> {
        const { streamId, mode, streamKey }: StreamMetadata = req.body;

        try {
            // 1. Primäre Validierung des Stream-Keys zur Vermeidung von Black-Screens
            const isValidKey = await this.streamService.verifyCredentials(streamId, streamKey);
            if (!isValidKey) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Invalid stream key. Ingest authorization failed.' 
                });
            }

            // 2. Weiche zwischen NPC-Automatisierung und manuellem Start
            if (mode === StartMode.NPC_AUTO) {
                await this.initializeNpcStream(streamId);
            } else {
                await this.initializeManualStream(streamId);
            }

            // Status initial auf 'pending' setzen, noch nicht 'active'
            await this.streamService.updateStatus(streamId, StreamStatus.PENDING);

            return res.status(200).json({ 
                success: true, 
                status: StreamStatus.PENDING,
                message: 'Stream initialization started. Waiting for ingest confirmation.' 
            });

        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Callback-Handler für den Media-Server (z.B. RTMP on_publish).
     * Setzt den Status erst nach physischer Bestätigung des Ingest-Slots auf 'active'.
     */
    public async onIngestConfirmed(req: Request, res: Response): Promise<Response> {
        const { streamId, app, flashver } = req.body;

        try {
            // Verifizierung des Ingest-Slots beim Media-Server
            const isIngestActive = await this.mediaServerProvider.checkActiveIngest(streamId);
            
            if (!isIngestActive) {
                await this.streamService.updateStatus(streamId, StreamStatus.ERROR);
                return res.status(404).send('Ingest slot validation failed.');
            }

            // Erst hier wird das Rendering-Signal für das Frontend freigegeben
            await this.streamService.updateStatus(streamId, StreamStatus.ACTIVE);
            
            return res.status(200).send('OK');
        } catch (error) {
            return res.status(500).send('Internal Server Error during ingest confirmation.');
        }
    }

    private async initializeNpcStream(streamId: string): Promise<void> {
        // Logik für automatisierten NPC-Ingest-Start
        await this.streamService.prepareNpcResources(streamId);
        await this.mediaServerProvider.allocateSlot(streamId, { priority: 'high' });
    }

    private async initializeManualStream(streamId: string): Promise<void> {
        // Logik für manuellen Benutzer-Ingest
        await this.mediaServerProvider.allocateSlot(streamId, { priority: 'standard' });
    }

    /**
     * Beendet den Stream und bereinigt Ressourcen.
     */
    public async stopStream(req: Request, res: Response): Promise<Response> {
        const { streamId } = req.params;

        try {
            await this.mediaServerProvider.closeIngest(streamId);
            await this.streamService.updateStatus(streamId, StreamStatus.IDLE);
            
            return res.status(200).json({ success: true, status: StreamStatus.IDLE });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
}

export default StreamController;