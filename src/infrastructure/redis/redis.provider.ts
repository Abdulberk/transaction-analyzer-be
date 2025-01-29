// src/infrastructure/redis/redis.provider.ts
import { FactoryProvider } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

export const redisClientFactory: FactoryProvider<Redis> = {
  provide: 'RedisClient',
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const redisInstance = new Redis({
      host: configService.get('REDIS_HOST'),
      port: configService.get('REDIS_PORT'),
      password: configService.get('REDIS_PASSWORD'),
    });

    redisInstance.on('error', (error) => {
      console.error('Redis error', error);
    });

    return redisInstance;
  },
};
