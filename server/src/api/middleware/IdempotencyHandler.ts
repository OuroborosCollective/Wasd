// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

interface IdempotencyRecord {
    statusCode: number;
    body: string;
    headers: any;
    timestamp: number;
}

const cache = new Map<string, IdempotencyRecord>();
const TTL = 1000 * 60 * 60 * 24; // 24 Stunden

/**
 * Bereinigt abgelaufene Einträge aus dem In-Memory Store
 */
const cleanup = () => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > TTL) {
            cache.delete(key);
        }
    }
};

// Regelmäßiges Cleanup alle 1 Stunde
setInterval(cleanup, 1000 * 60 * 60);

/**
 * Middleware zur Verarbeitung von Idempotency-Keys für B2B-Schnittstellen.
 * Verhindert Mehrfachausführungen bei identischen Request-Fingerprints.
 */
export const idempotencyHandler = (req: Request, res: Response, next: NextFunction): void => {
    const idempotencyKey = req.headers['x-idempotency-key'];

    // Nur für schreibende Operationen und wenn Key vorhanden ist
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
        return next();
    }

    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
        return next();
    }

    // Erzeugung eines Fingerprints aus Key, Pfad und Body
    const fingerprint = createHash('sha256')
        .update(`${idempotencyKey}:${req.originalUrl}:${JSON.stringify(req.body)}`)
        .digest('hex');

    const cachedResponse = cache.get(fingerprint);

    if (cachedResponse) {
        if (Date.now() - cachedResponse.timestamp < TTL) {
            res.set(cachedResponse.headers);
            res.set('x-idempotency-cache', 'HIT');
            res.status(cachedResponse.statusCode).send(cachedResponse.body);
            return;
        }
        cache.delete(fingerprint);
    }

    // Intercept res.send
    const originalSend = res.send;

    res.send = function (body?: any): Response {
        // Nur erfolgreiche Responses oder Client-Fehler cachen (keine Server-Fehler 5xx)
        if (res.statusCode >= 200 && res.statusCode < 500) {
            const responseBody = typeof body === 'string' ? body : JSON.stringify(body);
            
            cache.set(fingerprint, {
                statusCode: res.statusCode,
                body: responseBody,
                headers: res.getHeaders(),
                timestamp: Date.now()
            });
        }

        return originalSend.call(this, body);
    };

    next();
};

export default idempotencyHandler;