import { Request, Response, NextFunction } from 'express';
import { LoggingService } from '../services/LoggingService';

export const logMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const { statusCode } = res;
        const message = `[HTTP] ${method} ${originalUrl} ${statusCode} - ${duration}ms - IP: ${ip}`;

        if (statusCode >= 500) {
            LoggingService.error(message);
        } else if (statusCode >= 400) {
            LoggingService.warn(message);
        } else {
            LoggingService.info(message);
        }
    });

    next();
};