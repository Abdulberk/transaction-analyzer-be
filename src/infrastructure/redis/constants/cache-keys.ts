// src/infrastructure/redis/constants/cache-keys.ts
export const CACHE_KEYS = {
  PATTERNS: {
    all: 'patterns:all',
    byMerchant: (merchantId: string) => `patterns:merchant:${merchantId}`,
    single: (patternId: string) => `pattern:${patternId}`,
  },
  MERCHANTS: {
    all: 'merchants:all',
    single: (merchantId: string) => `merchant:${merchantId}`,
    byCategory: (category: string) => `merchants:category:${category}`,
    normalization: (name: string) => `merchant:normalize:${name}`,
    search: (params: string) => `merchants:search:${params}`,
  },
  TRANSACTIONS: {
    all: 'transactions:all',
    single: (id: string) => `transaction:${id}`,
    byMerchant: (merchantId: string) => `transactions:merchant:${merchantId}`,
    analysis: (id: string) => `transaction:${id}:analysis`,
  },
} as const;