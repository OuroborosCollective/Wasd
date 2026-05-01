import express, { Request, Response } from 'express';
import { IServerConfig, SharedUtils } from '@wasd/shared-lib';

const app = express();
const port = process.env.PORT || 3000;

const config: IServerConfig = {
    env: process.env.NODE_ENV || 'development',
    version: '1.0.0'
};

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'UP',
        config: config,
        timestamp: SharedUtils.getTimestamp()
    });
});

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});