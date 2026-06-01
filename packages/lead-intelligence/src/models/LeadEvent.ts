/**
 * LeadEvent model
 * Audit trail for all lead state changes
 */
import type { LeadEventType } from '../types/index.js';

/**
 * Represents a single event in the lead's audit trail
 */
export interface LeadEvent {
  /** Unique event identifier (deterministic) */
  event_id: string;
  /** Associated lead ID */
  lead_id: string;
  /** Type of event */
  event_type: LeadEventType;
  /** Tick when event occurred (deterministic, not Date) */
  timestamp: number;
  /** Who/what triggered this event */
  actor: string;
  /** Additional event data */
  payload: Record<string, unknown>;
}

/**
 * Create a new lead event
 * Uses deterministic ID generation
 */
export function createLeadEvent(
  leadId: string,
  eventType: LeadEventType,
  actor: string = 'system',
  payload: Record<string, unknown> = {},
  tick: number = 0
): LeadEvent {
  return {
    event_id: generateDeterministicEventId(leadId, eventType, tick),
    lead_id: leadId,
    event_type: eventType,
    timestamp: tick,
    actor,
    payload,
  };
}

/**
 * Generate deterministic event ID
 */
function generateDeterministicEventId(leadId: string, eventType: LeadEventType, tick: number): string {
  let hash = 0;
  const input = `${leadId}:${eventType}:${tick}`;

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  return `EVT-${hexHash}`;
}

/**
 * Validate lead event
 */
export function validateLeadEvent(event: LeadEvent): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!event.event_id || typeof event.event_id !== 'string') {
    errors.push('event_id is required and must be a string');
  }

  if (!event.lead_id || typeof event.lead_id !== 'string') {
    errors.push('lead_id is required and must be a string');
  }

  const validEventTypes: LeadEventType[] = [
    'created',
    'validated',
    'scored',
    'qualified',
    'disqualified',
    'contacted',
    'responded',
    'converted',
    'blocked',
    'deleted',
    'segment_assigned',
    'invite_sent',
    'invite_claimed',
    'feedback_received',
  ];

  if (!validEventTypes.includes(event.event_type)) {
    errors.push(`Invalid event_type: ${event.event_type}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get event type label for display
 */
export function getEventTypeLabel(eventType: LeadEventType): string {
  const labels: Record<LeadEventType, string> = {
    created: 'Lead Created',
    validated: 'Identifier Validated',
    scored: 'Lead Scored',
    qualified: 'Lead Qualified',
    disqualified: 'Lead Disqualified',
    contacted: 'Outreach Sent',
    responded: 'Response Received',
    converted: 'Converted to Tester',
    blocked: 'Lead Blocked',
    deleted: 'Lead Deleted',
    segment_assigned: 'Segment Assigned',
    invite_sent: 'Beta Invite Sent',
    invite_claimed: 'Beta Invite Claimed',
    feedback_received: 'Feedback Received',
  };

  return labels[eventType] ?? eventType;
}