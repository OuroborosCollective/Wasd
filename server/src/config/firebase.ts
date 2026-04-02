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
    const serviceAccount = JSON.parse(serviceAccountKey);
    app = initializeApp({
      credential: cert(serviceAccount), projectId: "innate-summit-490115-p5"
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
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    throw error;
  }
}
