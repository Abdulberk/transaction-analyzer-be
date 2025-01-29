// src/infrastructure/infrastructure.module.ts
import { Module } from '@nestjs/common';
import { RedisModule } from './redis/redis.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';

@Module({
  imports: [RedisModule, RabbitMQModule],
  exports: [RedisModule, RabbitMQModule],
})
export class InfrastructureModule {}
