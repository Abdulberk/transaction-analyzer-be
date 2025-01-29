// src/infrastructure/rabbitmq/rabbitmq.module.ts
import { Module } from '@nestjs/common';
import { RabbitMQRepository } from './rabbitmq.repository';
import { RabbitMQService } from './rabbitmq.service';
import { rabbitmqConnectionFactory } from './rabbitmq.provider';

@Module({
  providers: [rabbitmqConnectionFactory, RabbitMQRepository, RabbitMQService],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
