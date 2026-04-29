import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * AsyncMiddleware
 * Higher-order function to wrap asynchronous middleware functions.
 * Ensures that any errors occurring during asynchronous operations (like complex faction calculations)
 * are properly caught and passed to the next error-handling middleware, 
 * preventing race conditions and unhandled promise rejections.
 *
 * @param fn The asynchronous middleware function to be executed.
 * @returns A standard Express RequestHandler.
 */
export const asyncMiddleware = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | Promise<any>
): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            next(error);
        });
    };
};

/**
 * SequentialAsyncMiddleware
 * Ensures that multiple asynchronous middleware functions are executed in strict sequence.
 * 
 * @param middlewares Array of asynchronous request handlers.
 * @returns A single RequestHandler that executes the chain.
 */
export const sequentialAsyncMiddleware = (
    middlewares: Array<(req: Request, res: Response, next: NextFunction) => Promise<void> | Promise<any>>
): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            for (const middleware of middlewares) {
                await new Promise<void>((resolve, reject) => {
                    middleware(req, res, (err?: any) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    }).catch(reject);
                });
            }
            next();
        } catch (error) {
            next(error);
        }
    };
};