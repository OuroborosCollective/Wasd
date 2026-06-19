/**
 * Utility for parsing allowed origins from environment variables.
 */
export function getAllowedOrigins(): string[] {
  const env = process.env.NODE_ENV || "development";
  const rawAllowed = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS;

  if (rawAllowed) {
    return rawAllowed.split(",").map(o => o.trim()).filter(Boolean);
  }

  // Default for development/test
  if (env !== "production") {
    return ["*"];
  }

  // Strict default for production
  return [];
}

/**
 * Checks if a given origin is allowed based on the allowed origins list.
 */
export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (allowedOrigins.includes("*")) {
    return true;
  }
  if (!origin) {
    return false;
  }
  return allowedOrigins.includes(origin);
}
