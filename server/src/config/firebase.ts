/** Firebase auth stub - using Supabase instead */
import type { IncomingMessage } from "node:http";

export type FirebaseTokenPayload = {
  sub: string;
  email: string;
  email_verified: boolean;
  aud: string[];
  auth_time: number;
  exp: number;
  iat: number;
  iss: string;
  picture?: string;
  name?: string;
};

/** Verify Firebase ID token - stub, actually uses Supabase JWT */
export async function verifyFirebaseToken(
  idToken: string
): Promise<{ uid: string; email: string } | null> {
  // Supabase handles auth - this is a stub
  return null;
}

/** Check Firebase config exists */
export function hasFirebaseConfig(): boolean {
  return false;
}