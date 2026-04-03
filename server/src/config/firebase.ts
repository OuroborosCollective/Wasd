import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let app: App | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

/**
 * Parse FIREBASE_SERVICE_ACCOUNT_KEY: raw JSON, base64(JSON), or path to a JSON file.
 */
export function parseServiceAccountFromEnv(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.startsWith("{")) {
      return JSON.parse(trimmed) as Record<string, unknown>;
    }
  } catch {
    /* fall through */
  }
  try {
    const compact = trimmed.replace(/\s/g, "");
    if (/^[A-Za-z0-9+/=]+$/.test(compact) && !trimmed.startsWith("{")) {
      const decoded = Buffer.from(compact, "base64").toString("utf8");
      const d = decoded.trim();
      if (d.startsWith("{")) {
        return JSON.parse(d) as Record<string, unknown>;
      }
    }
  } catch {
    /* fall through */
  }
  try {
    const p = path.isAbsolute(trimmed) ? trimmed : path.resolve(process.cwd(), trimmed);
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf-8")) as Record<string, unknown>;
    }
  } catch {
    /* fall through */
  }
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Load applet config for database ID
let appletConfig: any = {};
try {
  const configPath = path.resolve(__dirname, '../../../firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    appletConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (e) {
  console.warn('Could not load firebase-applet-config.json in server:', e);
}

function getFirebaseApp(): App {
  if (app) return app;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
    return app;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not defined. Firebase Admin operations will be disabled.");
    return null as any;
  }

  try {
    const serviceAccount = parseServiceAccountFromEnv(serviceAccountKey);
    if (!serviceAccount || typeof serviceAccount !== "object") {
      console.error(
        "[Firebase] FIREBASE_SERVICE_ACCOUNT_KEY is set but could not be parsed (expect JSON object, base64 JSON, or path to .json)."
      );
      return null as any;
    }
    const pid = serviceAccount.project_id;
    const projectId =
      process.env.FIREBASE_PROJECT_ID?.trim() ||
      (typeof pid === "string" ? pid.trim() : "") ||
      "innate-summit-490115-p5";
    app = initializeApp({
      credential: cert(serviceAccount as any),
      projectId,
    });
    return app;
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw new Error(`Failed to initialize Firebase Admin: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const getDb = (): Firestore | null => {
  if (!dbInstance) {
    const firebaseApp = getFirebaseApp();
    if (!firebaseApp) return null;
    // Use the specific database ID if provided in the applet config
    if (appletConfig.firestoreDatabaseId) {
      dbInstance = getFirestore(firebaseApp, appletConfig.firestoreDatabaseId);
    } else {
      dbInstance = getFirestore(firebaseApp);
    }
  }
  return dbInstance;
};

export const getAuthInstance = (): Auth | null => {
  if (!authInstance) {
    const firebaseApp = getFirebaseApp();
    if (!firebaseApp) return null;
    authInstance = getAuth(firebaseApp);
  }
  return authInstance;
};

export function isFirebaseAuthConfigured(): boolean {
  return getAuthInstance() !== null;
}

// For backward compatibility if needed, but lazy getters are better
export const db = new Proxy({} as Firestore, {
  get: (_, prop) => (getDb() as any)[prop]
});

export const auth = new Proxy({} as Auth, {
  get: (_, prop) => (getAuthInstance() as any)[prop]
});

export async function verifyFirebaseToken(token: string) {
  try {
    const auth = getAuthInstance();
    if (!auth) {
      console.warn('Firebase Auth is not initialized. Skipping token verification.');
      return null;
    }
    return await auth.verifyIdToken(token);
  } catch (error: unknown) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    const msg = error instanceof Error ? error.message : String(error);
    console.error(
      `[Firebase] verifyIdToken failed${code ? ` (${code})` : ""}: ${msg.slice(0, 200)}`
    );
    throw error;
  }
}
