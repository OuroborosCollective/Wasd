/**
 * BetaInvite model
 * Tracks beta invite codes and their claim status
 */
import type { BetaInviteStatus } from '../types/index.js';

/**
 * Represents a beta invite for a lead
 */
export interface BetaInvite {
  /** Unique invite identifier */
  invite_id: string;
  /** Associated lead ID */
  lead_id: string;
  /** Unique invite code */
  invite_code: string;
  /** Current status of the invite */
  status: BetaInviteStatus;
  /** Timestamp when invite was created (tick-based) */
  created_at: number;
  /** Timestamp when invite was claimed (tick-based) */
  claimed_at: number | null;
  /** Timestamp when invite expires (tick-based) */
  expires_at: number | null;
}

/**
 * Create a new beta invite
 * Uses deterministic ID generation based on tick and lead_id
 */
export function createBetaInvite(
  leadId: string,
  inviteCode: string,
  expiresAtTick: number | null = null
): BetaInvite {
  // Deterministic ID generation using composition of lead_id and invite_code
  const inviteId = generateDeterministicInviteId(leadId, inviteCode);

  return {
    invite_id: inviteId,
    lead_id: leadId,
    invite_code: inviteCode,
    status: 'created',
    created_at: 0, // Set by caller with deterministic tick
    claimed_at: null,
    expires_at: expiresAtTick,
  };
}

/**
 * Generate deterministic invite ID from lead ID and code
 * Avoids using crypto.randomUUID() for reproducibility
 */
function generateDeterministicInviteId(leadId: string, inviteCode: string): string {
  // Simple hash function for deterministic output
  let hash = 0;
  const input = `${leadId}:${inviteCode}`;

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to hex string and pad
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  return `INV-${hexHash}-${inviteCode.slice(0, 8).toUpperCase()}`;
}

/**
 * Validate beta invite
 */
export function validateBetaInvite(invite: BetaInvite): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!invite.invite_id || typeof invite.invite_id !== 'string') {
    errors.push('invite_id is required and must be a string');
  }

  if (!invite.lead_id || typeof invite.lead_id !== 'string') {
    errors.push('lead_id is required and must be a string');
  }

  if (!invite.invite_code || typeof invite.invite_code !== 'string') {
    errors.push('invite_code is required and must be a string');
  }

  const validStatuses: BetaInviteStatus[] = ['created', 'sent', 'claimed', 'expired', 'revoked'];
  if (!validStatuses.includes(invite.status)) {
    errors.push(`Invalid status: ${invite.status}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if invite is valid for claiming
 */
export function canClaimInvite(invite: BetaInvite, currentTick: number): boolean {
  if (invite.status !== 'created' && invite.status !== 'sent') {
    return false;
  }

  if (invite.expires_at !== null && invite.expires_at <= currentTick) {
    return false;
  }

  return true;
}

/**
 * Mark invite as claimed
 */
export function claimBetaInvite(invite: BetaInvite, claimedAtTick: number): BetaInvite {
  return {
    ...invite,
    status: 'claimed',
    claimed_at: claimedAtTick,
  };
}

/**
 * Mark invite as expired
 */
export function expireBetaInvite(invite: BetaInvite, expiredAtTick: number): BetaInvite {
  return {
    ...invite,
    status: 'expired',
    expires_at: expiredAtTick,
  };
}

/**
 * Default expiry time in ticks (7 days at 10 ticks/second = 604800 ticks)
 */
export const DEFAULT_INVITE_EXPIRY_TICKS = 604800;