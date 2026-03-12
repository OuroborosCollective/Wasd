import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let app;
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!getApps().length) {
  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      app = initializeApp({
        credential: cert(serviceAccount)
      });
    } catch (error) {
      console.warn('Failed to initialize Firebase Admin with key:', error);
    }
  }

  if (!app) {
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY not set or invalid, using mock Firebase shell.");
  }
} else {
  app = getApps()[0];
}

export const db = app ? getFirestore(app) : ({
  collection: () => ({ doc: () => ({ get: () => Promise.resolve({ exists: false, data: () => ({}) }), set: () => Promise.resolve() }) })
} as any);
export const auth = app ? getAuth(app) : ({
  verifyIdToken: () => Promise.resolve({ uid: 'mock-uid' })
} as any);
