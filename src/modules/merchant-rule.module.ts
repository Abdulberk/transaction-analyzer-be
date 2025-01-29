// src/modules/merchant-rule.module.ts
import { Module } from '@nestjs/common';
import { MerchantRuleService } from '../services/merchant-rule.service';
import { PrismaService } from '../services/base/prisma.service';
import { RedisModule } from '../infrastructure/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [MerchantRuleService, PrismaService],
  exports: [MerchantRuleService],
})
export class MerchantRuleModule {}
