import { createHash, timingSafeEqual } from "node:crypto";

function hashBuffer(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Constant-time string comparison helper to protect tokens, secrets,
 * and sensitive administrative credentials from timing side-channel attacks.
 */
export function safeEqualText(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const left = hashBuffer(a);
  const right = hashBuffer(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
