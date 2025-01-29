// src/infrastructure/redis/redis.repository.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisRepository {
  private readonly logger = new Logger(RedisRepository.name);

  constructor(
    @Inject('RedisClient')
    private readonly redis: Redis,
  ) {}

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }
    } catch (error) {
      this.logger.error(`Failed to set Redis key ${key}:`, error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Failed to get Redis key ${key}:`, error);
      await this.redis.del(key);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete Redis key ${key}:`, error);
      throw error;
    }
  }

  async mget(keys: string[]): Promise<Array<any | null>> {
    try {
      const values = await this.redis.mget(keys);
      return values.map((value) => {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      });
    } catch (error) {
      this.logger.error(`Failed to mget Redis keys:`, error);
      return keys.map(() => null);
    }
  }
}