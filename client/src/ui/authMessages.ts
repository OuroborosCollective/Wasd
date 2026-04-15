type FirebaseLikeError = {
  code?: unknown;
  message?: unknown;
};

type SupabaseLikeError = {
  code?: unknown;
  message?: unknown;
  status?: unknown;
};

export function normalizeAuthEmail(rawEmail: string): string {
  return rawEmail.trim().toLowerCase();
}

export function validateEmailForAuth(email: string): string | null {
  const normalized = normalizeAuthEmail(email);
  if (!normalized) {
    return "Please enter your email address.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return "Please enter a valid email address.";
  }
  return null;
}

export function validatePasswordForLogin(password: string): string | null {
  if (!password || password.length === 0) {
    return "Please enter your password.";
  }
  return null;
}

export function validatePasswordForSignup(password: string): string | null {
  if (!password || password.length === 0) {
    return "Please enter a password.";
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }
  return null;
}

function asErrorCode(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }
  return input.trim().toLowerCase();
}

export function mapFirebaseAuthError(error: unknown): string {
  const candidate = (error ?? {}) as FirebaseLikeError;
  const code = asErrorCode(candidate.code);

  const mappedByCode: Record<string, string> = {
    "auth/email-already-in-use": "This email is already registered. Try signing in instead.",
    "auth/invalid-email": "The email address is invalid.",
    "auth/missing-password": "Please enter a password.",
    "auth/weak-password": "Password is too weak. Use at least 6 characters.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/user-not-found": "No account exists for this email.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Network problem. Check your connection and try again.",
    "auth/operation-not-allowed": "Email/password sign-in is disabled in Firebase Auth.",
    "auth/popup-closed-by-user": "Google sign-in popup was closed before completion.",
    "auth/popup-blocked": "Browser blocked the Google popup. Please allow popups and retry.",
  };
  if (code && mappedByCode[code]) {
    return mappedByCode[code];
  }

  if (typeof candidate.message === "string" && candidate.message.trim().length > 0) {
    return candidate.message.trim();
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }
  return "Authentication failed. Please try again.";
}

export function mapSupabaseAuthError(error: unknown): string {
  const candidate = (error ?? {}) as SupabaseLikeError;
  const code = asErrorCode(candidate.code);
  const message =
    typeof candidate.message === "string" && candidate.message.trim().length > 0
      ? candidate.message.trim()
      : "";

  const mappedByCode: Record<string, string> = {
    invalid_credentials: "Email or password is incorrect.",
    email_not_confirmed: "Please confirm your email before signing in.",
    weak_password: "Password is too weak. Use at least 6 characters.",
    user_already_exists: "This email is already registered. Try signing in instead.",
    signup_disabled: "Email/password sign-up is currently disabled.",
    over_request_rate_limit: "Too many attempts. Please wait a moment and try again.",
  };
  if (code && mappedByCode[code]) {
    return mappedByCode[code];
  }

  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (m.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (m.includes("user already registered")) {
    return "This email is already registered. Try signing in instead.";
  }
  if (m.includes("password should be at least")) {
    return "Password is too weak. Use at least 6 characters.";
  }
  if (m.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (message) return message;
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }
  return "Authentication failed. Please try again.";
}
