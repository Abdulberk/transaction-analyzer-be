// src/modules/pattern.module.ts
import { Module } from '@nestjs/common';
import { PatternController } from 'src/controllers/pattern.controller';
import { PatternService } from '../services/pattern.service';
import { MerchantModule } from './merchant.module';
import { PrismaService } from '../services/base/prisma.service';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { RabbitMQModule } from '../infrastructure/rabbitmq/rabbitmq.module';
import { OpenAIModule } from '../infrastructure/openai/openai.module';

@Module({
  imports: [MerchantModule, RedisModule, RabbitMQModule, OpenAIModule],
  controllers: [PatternController],
  providers: [PatternService, PrismaService],
  exports: [PatternService],
})
export class PatternModule {}
