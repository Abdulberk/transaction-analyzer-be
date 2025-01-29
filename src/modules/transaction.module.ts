// src/modules/transaction.module.ts
import { Module } from '@nestjs/common';
import { TransactionController } from '../controllers/transaction.controller';
import { TransactionService } from '../services/transaction.service';
import { PrismaService } from '../services/base/prisma.service';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { RabbitMQModule } from '../infrastructure/rabbitmq/rabbitmq.module';
import { MerchantModule } from './merchant.module';
import { PatternModule } from './pattern.module';

@Module({
  imports: [RedisModule, RabbitMQModule, MerchantModule, PatternModule],
  controllers: [TransactionController],
  providers: [TransactionService, PrismaService],
  exports: [TransactionService],
})
export class TransactionModule {}
