import cors from "cors";
import type { RequestHandler } from "express";
import { getAllowedOrigins, isOriginAllowed } from "../utils/corsUtils.js";

/**
 * Standardized CORS middleware for Areloria MMORPG.
 */
export const corsMiddleware = (): RequestHandler => {
  return cors((req, callback) => {
    const allowedOrigins = getAllowedOrigins();
    const origin = req.header("Origin");

    const isAllowed = isOriginAllowed(origin, allowedOrigins);

    let corsOptions: cors.CorsOptions = {
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-player-id", "apikey", "x-supabase-ref"],
      credentials: true,
      optionsSuccessStatus: 200,
    };

    if (isAllowed) {
      if (allowedOrigins.includes("*")) {
        // If we want to allow credentials, we MUST NOT return "*"
        // We must return the actual request origin instead.
        corsOptions.origin = origin || "*";
      } else {
        corsOptions.origin = origin;
      }
    } else {
      corsOptions.origin = false;
    }

    callback(null, corsOptions);
  });
};
