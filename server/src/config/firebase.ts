import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let app;

if (!getApps().length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKey) {
    throw new Error("Missing required environment variable: FIREBASE_SERVICE_ACCOUNT_KEY");
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    app = initializeApp({
      credential: cert(serviceAccount)
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
} else {
  app = getApps()[0];
}

export const db = getFirestore(app);
export const auth = getAuth(app);
