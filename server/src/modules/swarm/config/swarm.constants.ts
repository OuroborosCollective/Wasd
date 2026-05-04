// @ts-nocheck
export const SWARM_CONFIG = {
  REVIEWER: {
    MAX_ERROR_THRESHOLD: 0.2,
    MIN_CONFIDENCE_SCORE: 0.85,
    MAX_REVISION_CYCLES: 3,
    CRITICAL_SEVERITY_LEVEL: 'high'
  },
  DEVELOPER: {
    LOG_LEVEL: 'verbose',
    DEBUG_MODE: true,
    EMIT_COMMENTS: true,
    STRICT_MODE: true,
    SOURCE_MAPS: true
  },
  ARCHITECT: {
    CONSTRAINTS: {
      DRY_PRINCIPLE: true,
      SOLID_PRINCIPLE: true,
      MAX_FILE_SIZE_LINES: 500,
      PREFERRED_PATTERN: 'Modular Monolith',
      DEPENDENCY_INJECTION: true
    },
    ALLOWED_FRAMEWORKS: ['NestJS', 'Express', 'TypeORM'],
    ARCHITECTURE_LAYERS: ['API', 'Application', 'Domain', 'Infrastructure'],
    VERSIONING_STRATEGY: 'SemVer'
  },
  GENERAL: {
    MAX_CONCURRENT_TASKS: 10,
    TASK_TIMEOUT_MS: 30000,
    RETRY_STRATEGY: 'exponential_backoff',
    DEFAULT_LOCALE: 'en-US'
  }
} as const;

export type SwarmLogLevel = 'error' | 'warn' | 'info' | 'verbose' | 'debug';
export type ArchitecturePattern = 'Clean Architecture' | 'Modular Monolith' | 'Microservices';

export const SWARM_VERSION = '1.0.0';
export const SWARM_NAMESPACE = 'system.swarm.core';