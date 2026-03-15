import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let firebaseApp: admin.app.App | null = null;
let adminAuth: admin.auth.Auth | null = null;
let adminDb: admin.database.Database | null = null;

// Try to initialize Firebase Admin SDK with service account
const serviceAccountPaths = [
  join(__dirname, "../../service-account.json"),
  join(__dirname, "../../../service-account.json"),
  join(process.cwd(), "service-account.json"),
];

for (const saPath of serviceAccountPaths) {
  if (existsSync(saPath)) {
    try {
      const serviceAccount = JSON.parse(readFileSync(saPath, "utf-8"));
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://innate-summit-490115-p5-default-rtdb.europe-west1.firebasedatabase.app/"
      });
      adminAuth = admin.auth(firebaseApp);
      adminDb = admin.database(firebaseApp);
      console.log(`✅ Firebase Admin SDK initialized (project: ${serviceAccount.project_id})`);
      console.log(`🔗 Realtime Database connected: https://innate-summit-490115-p5-default-rtdb.europe-west1.firebasedatabase.app/`);
      break;
    } catch (err: any) {
      console.warn(`Firebase Admin: Failed to init from ${saPath}: ${err.message}`);
    }
  }
}

if (!firebaseApp) {
  console.log("Firebase Admin: No service account found, running without Firebase Admin SDK.");
}

/**
 * Verify a Firebase ID token and return the decoded token.
 * Falls back to returning the uid from the token payload if Admin SDK is not available.
 */
export async function verifyFirebaseToken(idToken: string): Promise<{ uid: string; email?: string; name?: string } | null> {
  if (adminAuth) {
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      return { uid: decoded.uid, email: decoded.email, name: decoded.name };
    } catch (err: any) {
      console.warn("Firebase token verification failed:", err.message);
      return null;
    }
  }

  // Fallback: decode JWT payload without verification (dev mode only)
  try {
    const parts = idToken.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
      if (payload.user_id || payload.sub) {
        return { uid: payload.user_id || payload.sub, email: payload.email, name: payload.name };
      }
    }
  } catch (_) {}
  return null;
}

export const db = adminDb;
export const auth = adminAuth;
export default firebaseApp;
