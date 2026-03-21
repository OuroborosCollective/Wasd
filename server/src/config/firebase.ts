import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let app: App | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

function getFirebaseApp(): App {
  if (app) return app;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
    return app;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required for Firebase Admin operations. Please provide the service account JSON as a string.");
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    app = initializeApp({
      credential: cert(serviceAccount)
    });
    return app;
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw new Error(`Failed to initialize Firebase Admin: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const getDb = (): Firestore => {
  if (!dbInstance) {
    dbInstance = getFirestore(getFirebaseApp());
  }
  return dbInstance;
};

export const getAuthInstance = (): Auth => {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
};

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
    return await auth.verifyIdToken(token);
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    throw error;
  }
}
