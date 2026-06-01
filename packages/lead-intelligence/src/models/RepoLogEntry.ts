/**
 * RepoLogEntry model
 * Documentation export for repository logs
 */
import type { RepoLogCategory } from '../types/index.js';

/**
 * Represents a log entry for repository documentation
 */
export interface RepoLogEntry {
  /** Unique log entry identifier (deterministic) */
  log_id: string;
  /** Category of the log entry */
  category: RepoLogCategory;
  /** Human-readable markdown summary */
  markdown_summary: string;
  /** Full JSON payload for detailed records */
  json_payload: Record<string, unknown>;
  /** Tick when log was created (deterministic) */
  created_at: number;
  /** Target path for repository documentation */
  target_path: string;
}

/**
 * Create a new repo log entry
 */
export function createRepoLogEntry(
  category: RepoLogCategory,
  markdownSummary: string,
  jsonPayload: Record<string, unknown>,
  tick: number = 0,
  targetPath: string = 'docs/lead-optimizer/'
): RepoLogEntry {
  return {
    log_id: generateDeterministicLogId(category, tick, jsonPayload),
    category,
    markdown_summary: markdownSummary,
    json_payload: jsonPayload,
    created_at: tick,
    target_path: targetPath,
  };
}

/**
 * Generate deterministic log ID
 */
function generateDeterministicLogId(
  category: RepoLogCategory,
  tick: number,
  payload: Record<string, unknown>
): string {
  let hash = 0;
  const input = `${category}:${tick}:${JSON.stringify(payload)}`;

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  return `LOG-${hexHash}`;
}

/**
 * Validate repo log entry
 */
export function validateRepoLogEntry(entry: RepoLogEntry): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!entry.log_id || typeof entry.log_id !== 'string') {
    errors.push('log_id is required and must be a string');
  }

  if (!entry.markdown_summary || typeof entry.markdown_summary !== 'string') {
    errors.push('markdown_summary is required and must be a string');
  }

  if (!entry.json_payload || typeof entry.json_payload !== 'object') {
    errors.push('json_payload is required and must be an object');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Format log entry as markdown document
 */
export function formatLogAsMarkdown(entry: RepoLogEntry): string {
  const lines: string[] = [
    `# Lead Optimizer Log - ${entry.category}`,
    '',
    `**Log ID**: ${entry.log_id}`,
    `**Created at Tick**: ${entry.created_at}`,
    '',
    '## Summary',
    '',
    entry.markdown_summary,
    '',
    '## Data',
    '',
    '```json',
    JSON.stringify(entry.json_payload, null, 2),
    '```',
  ];

  return lines.join('\n');
}

/**
 * Get filename for log entry
 */
export function getLogFilename(entry: RepoLogEntry, baseDate: string): string {
  const categorySlug = entry.category.replace(/_/g, '-');
  return `${baseDate}-${categorySlug}.md`;
}

/**
 * Log entry templates for common use cases
 */
export const LOG_TEMPLATES = {
  lead_extraction: (count: number, sources: string[], tick: number) =>
    createRepoLogEntry(
      'lead_extraction',
      `Extracted **${count}** new leads from ${sources.length} sources: ${sources.join(', ')}.`,
      { lead_count: count, sources, tick },
      tick
    ),

  scoring_run: (qualified: number, total: number, tick: number) =>
    createRepoLogEntry(
      'scoring_run',
      `Scoring run completed. Qualified **${qualified}** of ${total} leads (${Math.round((qualified / total) * 100)}%).`,
      { qualified, total, pass_rate: Math.round((qualified / total) * 100) },
      tick
    ),

  beta_invite: (inviteId: string, leadId: string, status: string, tick: number) =>
    createRepoLogEntry(
      'beta_invite',
      `Beta invite **${inviteId}** ${status} for lead ${leadId}.`,
      { invite_id: inviteId, lead_id: leadId, status },
      tick
    ),

  playtest_feedback: (leadId: string, qualityScore: number, tick: number) =>
    createRepoLogEntry(
      'playtest_feedback',
      `Playtest feedback received from lead ${leadId}. Quality score: **${qualityScore}**.`,
      { lead_id: leadId, quality_score: qualityScore },
      tick
    ),

  conversion_report: (converted: number, total: number, tick: number) =>
    createRepoLogEntry(
      'conversion_report',
      `Conversion report: **${converted}** of ${total} leads converted.`,
      { converted, total, conversion_rate: Math.round((converted / total) * 100) },
      tick
    ),
};