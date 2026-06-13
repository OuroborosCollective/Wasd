import { rateLimit } from "express-rate-limit";

/**
 * Generic rate limiter for administrative and high-risk endpoints.
 * Default: 100 requests per 15 minutes per IP.
 */
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: "draft-8", // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  message: {
    error: "Too many requests from this IP, please try again after 15 minutes",
    errorDe: "Zu viele Anfragen von dieser IP, bitte versuchen Sie es in 15 Minuten erneut.",
  },
});

/**
 * Stricter rate limiter for sensitive write operations.
 * Default: 10 requests per 15 minutes per IP.
 */
export const sensitiveWriteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Limit each IP to 10 requests per `window`
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many sensitive operations from this IP, please try again after 15 minutes",
    errorDe: "Zu viele sensible Operationen von dieser IP, bitte versuchen Sie es in 15 Minuten erneut.",
  },
});
