// src/infrastructure/redis/redis.service.ts
import { Injectable } from '@nestjs/common';
import { RedisRepository } from './redis.repository';
import { CACHE_KEYS } from './constants/cache-keys';
import { CACHE_TTL } from './constants/cache-ttl';

@Injectable()
export class RedisService {
  constructor(private readonly redisRepository: RedisRepository) {}

  // Generic methods
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.redisRepository.set(key, value, ttl);
  }

  async get<T>(key: string): Promise<T | null> {
    return this.redisRepository.get<T>(key);
  }

  async del(key: string): Promise<void> {
    await this.redisRepository.del(key);
  }

  async mget(keys: string[]): Promise<Array<any | null>> {
    return this.redisRepository.mget(keys);
  }


  async invalidatePatternCaches(merchantId?: string): Promise<void> {
    const keys: string[] = [CACHE_KEYS.PATTERNS.all];
    if (merchantId) {
      keys.push(CACHE_KEYS.PATTERNS.byMerchant(merchantId));
    }
    await Promise.all(keys.map((key) => this.del(key)));
  }

  async invalidateMerchantCaches(
    merchantId?: string,
    category?: string,
  ): Promise<void> {
    const keys: string[] = [CACHE_KEYS.MERCHANTS.all];
    if (merchantId) {
      keys.push(CACHE_KEYS.MERCHANTS.single(merchantId));
    }
    if (category) {
      keys.push(CACHE_KEYS.MERCHANTS.byCategory(category));
    }
    await Promise.all(keys.map((key) => this.del(key)));
  }

  async invalidateTransactionCaches(
    transactionId?: string,
    merchantId?: string,
  ): Promise<void> {
    const keys: string[] = [CACHE_KEYS.TRANSACTIONS.all];
    if (transactionId) {
      keys.push(CACHE_KEYS.TRANSACTIONS.single(transactionId));
    }
    if (merchantId) {
      keys.push(CACHE_KEYS.TRANSACTIONS.byMerchant(merchantId));
    }
    await Promise.all(keys.map((key) => this.del(key)));
  }
}
