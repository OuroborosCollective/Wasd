/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** e.g. http://localhost:3000 — must expose POST /api/v1/science-mascot (Gemini proxy on Wasd server). */
  readonly VITE_WASD_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
