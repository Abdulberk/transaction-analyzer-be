// src/infrastructure/redis/redis.service.ts
import { Injectable } from '@nestjs/common';
import { RedisRepository } from './redis.repository';

@Injectable()
export class RedisService {
  constructor(private readonly redisRepository: RedisRepository) {}

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.redisRepository.set(key, value, ttl);
  }

  async get<T>(key: string): Promise<T | null> {
    return this.redisRepository.get<T>(key);
  }

  async del(key: string): Promise<void> {
    await this.redisRepository.del(key);
  }
}
