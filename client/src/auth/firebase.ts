import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA96_GG61GsDBHh4ysw4-AfoRHVJ_MNQJw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "studio-8985161445-f6ce5.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "studio-8985161445-f6ce5",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "studio-8985161445-f6ce5.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "426167977735",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:426167977735:web:5e2951f4365b233af167a2",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
