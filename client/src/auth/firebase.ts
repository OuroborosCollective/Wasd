import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import fallbackConfig from "../../../firebase-applet-config.json";

function trimEnv(key: string): string {
  const v = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.[key];
  return typeof v === "string" ? v.trim() : "";
}

function buildConfig() {
  const apiKey = trimEnv("VITE_FIREBASE_API_KEY");
  if (apiKey) {
    return {
      apiKey,
      authDomain: trimEnv("VITE_FIREBASE_AUTH_DOMAIN"),
      projectId: trimEnv("VITE_FIREBASE_PROJECT_ID"),
      appId: trimEnv("VITE_FIREBASE_APP_ID"),
      messagingSenderId: trimEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
      storageBucket: trimEnv("VITE_FIREBASE_STORAGE_BUCKET"),
      measurementId: trimEnv("VITE_FIREBASE_MEASUREMENT_ID"),
      firestoreDatabaseId: trimEnv("VITE_FIRESTORE_DATABASE_ID") || (fallbackConfig as any).firestoreDatabaseId,
    };
  }
  return {
    apiKey: (fallbackConfig as any).apiKey,
    authDomain: (fallbackConfig as any).authDomain,
    projectId: (fallbackConfig as any).projectId,
    appId: (fallbackConfig as any).appId,
    messagingSenderId: (fallbackConfig as any).messagingSenderId,
    storageBucket: (fallbackConfig as any).storageBucket,
    measurementId: (fallbackConfig as any).measurementId || "",
    firestoreDatabaseId: (fallbackConfig as any).firestoreDatabaseId,
  };
}

const webConfig = buildConfig();

let app: FirebaseApp | null = null;
try {
  if (webConfig.apiKey) {
    app = initializeApp({
      apiKey: webConfig.apiKey,
      authDomain: webConfig.authDomain,
      projectId: webConfig.projectId,
      appId: webConfig.appId,
      messagingSenderId: webConfig.messagingSenderId,
      storageBucket: webConfig.storageBucket,
      measurementId: webConfig.measurementId || undefined,
    });
  }
} catch (e) {
  console.warn("Firebase web init failed:", e);
}

export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null =
  app && webConfig.firestoreDatabaseId ? getFirestore(app, webConfig.firestoreDatabaseId) : null;

export function isFirebaseClientConfigured(): boolean {
  return Boolean(app && webConfig.apiKey);
}

/** Default FirebaseApp for AI Logic (`firebase/ai`) — same instance as Auth when configured. */
export function getFirebaseAppOrNull(): FirebaseApp | null {
  if (app) return app;
  const existing = getApps();
  return existing.length > 0 ? existing[0]! : null;
}
