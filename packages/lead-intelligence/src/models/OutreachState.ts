/**
 * OutreachState model
 * Tracks the outreach status and contact history for each lead
 */
import type { OutreachStatus } from '../types/index.js';

/**
 * State for tracking outreach and contact attempts
 */
export interface OutreachState {
  /** Current outreach status */
  status: OutreachStatus;
  /** Timestamp of last contact attempt (tick-based, not Date) */
  last_contacted_at: number;
  /** Number of contact attempts made */
  contact_attempts: number;
  /** Preferred contact channel (platform identifier) */
  preferred_channel: string | null;
  /** ID of the last message template used */
  last_message_template_id: string | null;
}

/**
 * Create default outreach state
 */
export function createDefaultOutreachState(): OutreachState {
  return {
    status: 'not_contacted',
    last_contacted_at: 0,
    contact_attempts: 0,
    preferred_channel: null,
    last_message_template_id: null,
  };
}

/**
 * Validate outreach state
 */
export function validateOutreachState(state: OutreachState): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const validStatuses: OutreachStatus[] = [
    'not_contacted',
    'queued',
    'contacted',
    'responded',
    'accepted',
    'declined',
    'bounced',
    'do_not_contact',
  ];

  if (!validStatuses.includes(state.status)) {
    errors.push(`Invalid status: ${state.status}`);
  }

  if (typeof state.contact_attempts !== 'number' || state.contact_attempts < 0) {
    errors.push('contact_attempts must be a non-negative number');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if outreach is allowed for current state
 */
export function canAttemptContact(state: OutreachState): boolean {
  return (
    state.status === 'not_contacted' ||
    state.status === 'queued' ||
    state.status === 'contacted' ||
    state.status === 'responded'
  );
}

/**
 * Get next status based on action
 */
export function getNextStatus(
  currentStatus: OutreachStatus,
  action: 'queue' | 'contact' | 'respond' | 'accept' | 'decline' | 'bounce' | 'block'
): OutreachStatus {
  const transitions: Record<string, Record<string, OutreachStatus>> = {
    not_contacted: {
      queue: 'queued',
      contact: 'contacted',
      block: 'do_not_contact',
    },
    queued: {
      contact: 'contacted',
      block: 'do_not_contact',
    },
    contacted: {
      respond: 'responded',
      decline: 'declined',
      bounce: 'bounced',
      block: 'do_not_contact',
    },
    responded: {
      accept: 'accepted',
      decline: 'declined',
    },
  };

  const currentTransitions = transitions[currentStatus];
  if (currentTransitions && currentTransitions[action]) {
    return currentTransitions[action];
  }

  return currentStatus;
}

/**
 * Max contact attempts before auto-block
 */
export const MAX_CONTACT_ATTEMPTS = 3;

/**
 * Update outreach state for auto-block
 */
export function updateForAutoBlock(state: OutreachState): OutreachState {
  return {
    ...state,
    status: 'do_not_contact',
    contact_attempts: MAX_CONTACT_ATTEMPTS,
  };
}