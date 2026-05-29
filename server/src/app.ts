import express, { Express } from "express";

export const app: Express = express();

app.use(express.json());

/**
 * Health Check Endpoint
 * Provides status for Liveness and Readiness probes.
 */
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

export default app;
