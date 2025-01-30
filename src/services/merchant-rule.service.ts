// src/services/merchant-rule.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './base/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { CreateMerchantRuleDto } from 'src/dto/merchant-rule/create-merchant-rule.dto';
import { MerchantRule } from '@prisma/client';

@Injectable()
export class MerchantRuleService {
  private readonly logger = new Logger(MerchantRuleService.name);
  private readonly CACHE_TTL = 3600;
  private readonly CACHE_KEYS = {
    rule: (id: string) => `merchant:rule:${id}`,
    patterns: (merchantId?: string) =>
      merchantId ? `merchant:${merchantId}:rules` : 'merchant:rules:all',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createRule(merchantId: string, dto: CreateMerchantRuleDto) {
    try {
      const rule = await this.prisma.merchantRule.create({
        data: {
          ...dto,
          merchant: {
            connect: { id: merchantId },
          },
        },
      });

      await this.invalidateCache(merchantId);
      return rule;
    } catch (error) {
      this.logger.error(`Failed to create merchant rule: ${error.message}`);
      throw error;
    }
  }

  async getRulesByMerchant(merchantId?: string): Promise<MerchantRule[]> {
    const cacheKey = this.CACHE_KEYS.patterns(merchantId);
    const cached = await this.redis.get<MerchantRule[]>(cacheKey);
    if (cached) return cached;

    const rules = await this.prisma.merchantRule.findMany({
      where: merchantId
        ? {
            merchantId,
            isActive: true,
          }
        : {
            isActive: true,
          },
      orderBy: { priority: 'desc' },
    });

    await this.redis.set(cacheKey, rules, this.CACHE_TTL);
    return rules;
  }

  private async invalidateCache(merchantId?: string) {
    await this.redis.del(this.CACHE_KEYS.patterns(merchantId));

    await this.redis.del(this.CACHE_KEYS.patterns());
  }
}
