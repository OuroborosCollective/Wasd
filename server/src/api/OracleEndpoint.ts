// @ts-nocheck
import { Router, Request, Response } from 'express';

const router: Router = Router();

interface AREPayload {
    player: string;
    li: string | number;
    ph: string | number;
    plx: string | number;
}

/**
 * StateStorage handle for retrieving deterministic game states.
 * Wraps DB/Cache access for AREPayload sequences.
 */
class StateStorage {
    static async getPayloads(sessionId: string, chunkId: number): Promise<AREPayload[]> {
        // This is a placeholder for actual DB/Cache access logic.
        // In a live environment, this would query Redis or a persistent store.
        return []; 
    }
}

/**
 * GET /stream/:sessionId/:chunkId
 * Returns a serialized chain of game state payloads for reconstruction.
 */
router.get('/stream/:sessionId/:chunkId', async (req: Request, res: Response) => {
    const { sessionId, chunkId } = req.params;

    // Validation for Session ID (UUID or standard alphanumeric identifiers)
    const sessionIdRegex = /^[a-zA-Z0-9\-_]{4,64}$/;
    if (!sessionId || !sessionIdRegex.test(sessionId)) {
        return res.status(400).send('Invalid SessionID format.');
    }

    const chunkIndex = parseInt(chunkId, 10);
    if (isNaN(chunkIndex) || chunkIndex < 0) {
        return res.status(400).send('Invalid ChunkID.');
    }

    try {
        const payloads: AREPayload[] = await StateStorage.getPayloads(sessionId, chunkIndex);

        if (!payloads || payloads.length === 0) {
            return res.status(404).json({
                sessionId,
                chunkId: chunkIndex,
                payloads: [],
                info: 'No data available for requested chunk'
            });
        }

        // Serialization into deterministic string format: 'player|li:val|ph:val|plx:val'
        const serializedChains: string[] = payloads.map((p) => {
            return `${p.player}|li:${p.li}|ph:${p.ph}|plx:${p.plx}`;
        });

        res.set('Content-Type', 'application/json');
        return res.status(200).json({
            sessionId,
            chunkId: chunkIndex,
            payloads: serializedChains,
            checksum: Buffer.from(JSON.stringify(serializedChains)).toString('base64').substring(0, 8)
        });
    } catch (error) {
        console.error(`[OracleEndpoint] Error fetching replay data: ${error}`);
        return res.status(500).send('Internal Server Error during replay retrieval.');
    }
});

export default router;