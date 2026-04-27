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

export function mapSupabaseAuthError(error: unknown): string {
  if (typeof error === "string") {
    if (error.trim().length === 0 || error === "{}") {
      return "Authentication failed (empty response). Please try again.";
    }
    if (error.includes("<!DOCTYPE") || error.includes("<html")) {
      return "Authentication server returned an HTML error. Please check your server configuration.";
    }
    return error.trim();
  }

  const candidate = (error ?? {}) as SupabaseLikeError;
  const code = asErrorCode(candidate.code);
  const message =
    typeof candidate.message === "string" && candidate.message.trim().length > 0
      ? candidate.message.trim()
      : "";

  if (message.includes("<!DOCTYPE") || message.includes("<html")) {
    return "Authentication server returned an HTML error. Please check your server configuration.";
  }

  const mappedByCode: Record<string, string> = {
    invalid_credentials: "Email or password is incorrect.",
    email_not_confirmed: "Please confirm your email before signing in.",
    weak_password: "Password is too weak. Use at least 6 characters.",
    user_already_exists: "This email is already registered. Try signing in instead.",
    signup_disabled: "Email/password sign-up is currently disabled.",
    over_request_rate_limit: "Too many attempts. Please wait a moment and try again.",
    supabase_auth_proxy_not_configured:
      "Server auth proxy is not configured yet. Set SUPABASE_URL on the server or deploy with a valid Supabase anon key.",
  };
  if (code && mappedByCode[code]) {
    return mappedByCode[code];
  }

  const m = message.toLowerCase();
  if (m.includes("failed to fetch")) {
    return "Network problem while contacting Supabase. Please check your connection and server URL.";
  }
  if (m.includes("fetch")) {
    return "Could not reach authentication server. Please try again in a moment.";
  }
  if (m.includes("unauthorized redirect uri") || m.includes("redirect url")) {
    return "Google login redirect is not allowed yet. Add this URL in Supabase Auth redirect settings.";
  }
  if (m.includes("provider is not enabled") || m.includes("unsupported provider")) {
    return "Google login is not enabled in Supabase Auth providers.";
  }
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
  if (m.includes("failed to fetch") || m.includes("networkerror")) {
    return "Could not reach Supabase Auth. Check URL/SSL/CORS configuration and try again.";
  }
  if (m.includes("timeout")) {
    return "Authentication request timed out. Please retry.";
  }
  if (m.includes(":8000")) {
    return "Auth endpoint points to port 8000, which is usually a stale public URL. Use your HTTPS domain URL.";
  }

  if (message) return message;
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  const errorStr = JSON.stringify(error);
  if (errorStr === "{}" || errorStr === "[]") {
    return "Authentication failed (unknown error). Please try again.";
  }

  return "Authentication failed. Please try again.";
}
