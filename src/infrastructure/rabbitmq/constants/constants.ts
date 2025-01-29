// src/infrastructure/rabbitmq/constants.ts
export const EXCHANGES = {
  TRANSACTION: {
    name: 'transaction.exchange',
    type: 'topic',
  },
  MERCHANT: {
    name: 'merchant.exchange',
    type: 'topic',
  },
  PATTERN: {
    name: 'pattern.exchange',
    type: 'topic',
  },
  ANALYSIS: {
    name: 'analysis.exchange',
    type: 'topic',
  },
} as const;

export const QUEUES = {
  TRANSACTION: {
    CREATED: 'transaction.created.queue',
    ANALYZED: 'transaction.analyzed.queue',
  },
  MERCHANT: {
    NORMALIZED: 'merchant.normalized.queue',
    UPDATED: 'merchant.updated.queue',
  },
  PATTERN: {
    DETECTED: 'pattern.detected.queue',
    UPDATED: 'pattern.updated.queue',
  },
  ANALYSIS: {
    COMPLETED: 'analysis.completed.queue',
  },
} as const;

export const ROUTING_KEYS = {
  TRANSACTION: {
    CREATED: 'transaction.created',
    ANALYZED: 'transaction.analyzed',
  },
  MERCHANT: {
    NORMALIZED: 'merchant.normalized',
    UPDATED: 'merchant.updated',
  },
  PATTERN: {
    DETECTED: 'pattern.detected',
    UPDATED: 'pattern.updated',
  },
  ANALYSIS: {
    COMPLETED: 'analysis.completed',
  },
} as const;
