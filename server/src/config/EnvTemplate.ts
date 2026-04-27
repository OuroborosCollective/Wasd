export const EnvTemplate = {
  PORT: "3000",
  NODE_ENV: "development",
  
  // WebSocket Configuration (Local Development)
  NEXT_PUBLIC_WEBSOCKET_URL: "ws://localhost:3000/ws",
  
  // Optional: Redis for caching (graceful fallback to in-memory if not configured)
  REDIS_URL: "",
  REDIS_HOST: "",
  REDIS_PORT: "6379",
  REDIS_USER: "",
  REDIS_PASSWORD: "",
  REDIS_TLS: "true",

  // Persistence Driver (auto, file, postgres, redis)
  PERSISTENCE_DRIVER: "auto"
};
