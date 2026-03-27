export const EnvTemplate = {
  PORT: "3000",
  NODE_ENV: "development",
  
  // Firebase Configuration (Primary)
  FIREBASE_PROJECT_ID: "your-project-id",
  FIREBASE_SERVICE_ACCOUNT_KEY: "{}",
  
  // WebSocket Configuration (Local Development)
  NEXT_PUBLIC_WEBSOCKET_URL: "ws://localhost:3000/ws",
  
  // Optional: Redis for caching (graceful fallback to in-memory if not configured)
  REDIS_HOST: "",
  REDIS_PORT: "6379",
  REDIS_PASSWORD: "",
  REDIS_TLS: "true"
};
