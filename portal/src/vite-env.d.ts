/// <reference types="vite/client" />
/// <reference types="react" />

interface ImportMetaEnv {
  /** e.g. http://localhost:3000 — must expose POST /api/v1/science-mascot (Gemini proxy on Wasd server). */
  readonly VITE_WASD_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace JSX {
  type Element = import("react").ReactElement;
}
