// src/modules/merchant.module.ts
import { Module } from '@nestjs/common';
import { MerchantController } from '../controllers/merchant.controller';
import { MerchantService } from '../services/merchant.service';
import { PrismaService } from '../services/base/prisma.service';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { RabbitMQModule } from '../infrastructure/rabbitmq/rabbitmq.module';
import { OpenAIModule } from 'src/infrastructure/openai/openai.module';
import { AnalysisModule } from './analysis.module';
import { MerchantRuleModule } from './merchant-rule.module';

@Module({
  imports: [
    RedisModule,
    RabbitMQModule,
    OpenAIModule,
    AnalysisModule,
    MerchantRuleModule,
  ],
  controllers: [MerchantController],
  providers: [MerchantService, PrismaService],
  exports: [MerchantService],
})
export class MerchantModule {}
