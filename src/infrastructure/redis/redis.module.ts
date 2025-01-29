// src/infrastructure/redis/redis.module.ts
import { Module } from '@nestjs/common';
import { RedisRepository } from './redis.repository';
import { RedisService } from './redis.service';
import { redisClientFactory } from './redis.provider';

@Module({
  providers: [RedisService, RedisRepository, redisClientFactory],
  exports: [RedisService, RedisRepository, redisClientFactory],
})
export class RedisModule {}
