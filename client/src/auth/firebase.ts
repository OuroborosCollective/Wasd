import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDNtRSXemeuFHGh1z0QW9yFTKXBd5819Fw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "innate-summit-490115-p5.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "innate-summit-490115-p5",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "innate-summit-490115-p5.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "153769894689",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:153769894689:web:8003bc0227caf846f65460",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-DZXMJ50BRQ",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Analytics nur im Browser initialisieren (nicht in SSR/Node)
if (typeof window !== "undefined") {
  try {
    getAnalytics(app);
  } catch (_) {
    // Analytics optional - kein Fehler wenn nicht verfügbar
  }
}
