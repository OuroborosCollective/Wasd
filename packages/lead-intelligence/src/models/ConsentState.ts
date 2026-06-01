/**
 * ConsentState model
 * GDPR-compliant consent tracking for German/EU compliance
 */
import type { LeadSourceType } from '../types/index.js';

/**
 * Tracks consent state for GDPR compliance
 */
export interface ConsentState {
  /** Whether explicit consent has been given */
  has_consent: boolean;
  /** Source/channel where consent was obtained */
  consent_source: string | null;
  /** Tick when consent was given */
  consent_timestamp: number;
  /** Whether outreach contact is permitted */
  can_contact: boolean;
  /** Whether profile data can be stored */
  can_store_profile: boolean;
  /** Whether deletion has been requested */
  deletion_requested: boolean;
}

/**
 * Create default consent state (no consent)
 */
export function createDefaultConsentState(): ConsentState {
  return {
    has_consent: false,
    consent_source: null,
    consent_timestamp: 0,
    can_contact: false,
    can_store_profile: false,
    deletion_requested: false,
  };
}

/**
 * Create consent state from playtest signup
 */
export function createPlaytestConsent(consentSource: string, consentTick: number): ConsentState {
  return {
    has_consent: true,
    consent_source: consentSource,
    consent_timestamp: consentTick,
    can_contact: true,
    can_store_profile: true,
    deletion_requested: false,
  };
}

/**
 * Validate consent state
 */
export function validateConsentState(state: ConsentState): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof state.has_consent !== 'boolean') {
    errors.push('has_consent must be a boolean');
  }

  if (typeof state.can_contact !== 'boolean') {
    errors.push('can_contact must be a boolean');
  }

  if (typeof state.can_store_profile !== 'boolean') {
    errors.push('can_store_profile must be a boolean');
  }

  if (typeof state.deletion_requested !== 'boolean') {
    errors.push('deletion_requested must be a boolean');
  }

  // If consent is given, contact should be allowed
  if (state.has_consent && !state.can_contact) {
    errors.push('If consent is given, can_contact should be true');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if lead can be contacted under GDPR rules
 */
export function canContactLead(state: ConsentState): boolean {
  return state.has_consent && state.can_contact && !state.deletion_requested;
}

/**
 * Check if lead data should be retained
 */
export function shouldRetainLeadData(state: ConsentState): boolean {
  // Data should be retained if there's consent and no deletion request
  return state.can_store_profile && !state.deletion_requested;
}

/**
 * Mark lead for deletion (GDPR right to be forgotten)
 */
export function requestDeletion(state: ConsentState, requestedAtTick: number): ConsentState {
  return {
    ...state,
    deletion_requested: true,
    can_contact: false,
    can_store_profile: false,
  };
}