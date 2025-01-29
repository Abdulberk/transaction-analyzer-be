// src/services/merchant.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './base/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { RabbitMQService } from '../infrastructure/rabbitmq/rabbitmq.service';
import { Prisma } from '@prisma/client';
import { OpenAIService } from 'src/infrastructure/openai/openai.service';
import type {
  CreateMerchantDto,
  MerchantAnalysisDto,
  MerchantResponseDto,
  NormalizeMerchantDto,
  NormalizeMerchantRequestDto,
  NormalizeMerchantResponseDto,
} from 'src/dto/merchant';
import { MerchantRuleService } from './merchant-rule.service';
import { AnalysisCacheService } from './analysis-cache.service';
type MerchantWithCount = Prisma.MerchantGetPayload<{
  include: { _count: { select: { transactions: true } } };
}>;
interface SearchMerchantsParams {
  category?: string;
  isActive?: boolean;
  query?: string;
  page?: number;
  limit?: number;
}
interface SearchMerchantsResult {
  items: MerchantResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
@Injectable()
export class MerchantService {
  private readonly logger = new Logger(MerchantService.name);
  private readonly CACHE_TTL = 3600 * 24;
  private readonly CACHE_KEYS = {
    merchant: (id: string) => `merchant:${id}`,
    normalization: (name: string) => `merchant:normalize:${name}`,
  } as const;
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly rabbitmq: RabbitMQService,
    private readonly openai: OpenAIService,
    private readonly analysisCacheService: AnalysisCacheService,
    private readonly merchantRuleService: MerchantRuleService,
  ) {}
  async createMerchant(dto: CreateMerchantDto): Promise<MerchantResponseDto> {
    try {
      const existingMerchant = await this.findExistingMerchant(dto);
      if (existingMerchant) {
        throw new Error('Merchant already exists');
      }
      const merchant = await this.prisma.merchant.create({
        data: this.mapToCreateInput(dto),
        include: {
          _count: {
            select: { transactions: true },
          },
        },
      });
      await this.cacheMerchant(merchant.id, merchant);
      await this.rabbitmq.publishMerchantCreated({
        merchantId: merchant.id,
        normalizedName: merchant.normalizedName,
        category: merchant.category,
      });
      this.logger.log(`Merchant created: ${merchant.id}`);
      return this.mapToResponseDto(merchant);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create merchant: ${message}`);
      throw error;
    }
  }
  async getMerchant(id: string): Promise<MerchantResponseDto | null> {
    try {
      const cached = await this.getFromCache(id);
      if (cached) {
        this.logger.debug(`Cache hit for merchant: ${id}`);
        return this.mapToResponseDto(cached);
      }
      const merchant = await this.prisma.merchant.findUnique({
        where: { id },
        include: {
          _count: {
            select: { transactions: true },
          },
        },
      });
      if (!merchant) {
        return null;
      }
      await this.cacheMerchant(id, merchant);
      return this.mapToResponseDto(merchant);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get merchant: ${id} - ${message}`);
      throw error;
    }
  }
  async normalizeMerchant(
    dto: NormalizeMerchantDto,
  ): Promise<MerchantAnalysisDto> {
    try {
      // Önce kuralları kontrol et
      const ruleMatch = await this.applyMerchantRules(dto.description);
      if (ruleMatch) {
        return {
          normalizedName: ruleMatch.normalizedName,
          category: ruleMatch.category,
          subCategory: ruleMatch.subCategory,
          confidence: ruleMatch.confidence,
          flags: [],
        };
      }
      const aiAnalysis = await this.openai.analyzeMerchant(dto.description);
      await this.analysisCacheService.set(
        `merchant:normalize:${dto.description}`,
        aiAnalysis,
        60,
      );
      return aiAnalysis;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to normalize merchant: ${message}`);
      throw error;
    }
  }
  async normalizeTransaction(
    dto: NormalizeMerchantRequestDto,
  ): Promise<NormalizeMerchantResponseDto> {
    const analysis = await this.normalizeMerchant({
      description: dto.transaction.description,
    });
    return {
      normalized: {
        merchant: analysis.normalizedName,
        category: analysis.category,
        sub_category: analysis.subCategory || '',
        confidence: analysis.confidence,
        is_subscription: analysis.flags.includes('Subscription'),
        flags: analysis.flags.map((flag) =>
          flag.toLowerCase().replace(' ', '_'),
        ),
      },
    };
  }
  async updateMerchant(
    id: string,
    data: Partial<CreateMerchantDto>,
  ): Promise<MerchantResponseDto> {
    try {
      const merchant = await this.prisma.merchant.update({
        where: { id },
        data: this.mapToUpdateInput(data),
        include: {
          _count: {
            select: { transactions: true },
          },
        },
      });
      await this.cacheMerchant(id, merchant);
      await this.invalidateNormalizationCache(merchant.originalName);
      await this.rabbitmq.publishMerchantUpdated({
        merchantId: merchant.id,
        normalizedName: merchant.normalizedName,
        category: merchant.category,
      });
      this.logger.log(`Merchant updated: ${id}`);
      return this.mapToResponseDto(merchant);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update merchant: ${id} - ${message}`);
      throw error;
    }
  }
  async deactivateMerchant(id: string): Promise<void> {
    try {
      const merchant = await this.prisma.merchant.update({
        where: { id },
        data: { isActive: false },
        include: {
          _count: {
            select: { transactions: true },
          },
        },
      });
      await this.redis.del(this.CACHE_KEYS.merchant(id));
      await this.invalidateNormalizationCache(merchant.originalName);
      await this.rabbitmq.publishMerchantDeactivated({
        merchantId: id,
        normalizedName: merchant.normalizedName,
      });
      this.logger.log(`Merchant deactivated: ${id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to deactivate merchant: ${id} - ${message}`);
      throw error;
    }
  }
  private async findExistingMerchant(dto: CreateMerchantDto) {
    return this.prisma.merchant.findFirst({
      where: {
        OR: [
          { originalName: dto.originalName },
          { normalizedName: dto.normalizedName },
        ],
      },
    });
  }
  private async getFromCache(id: string): Promise<MerchantWithCount | null> {
    return this.redis.get<MerchantWithCount>(this.CACHE_KEYS.merchant(id));
  }
  private async cacheMerchant(
    id: string,
    merchant: MerchantWithCount,
  ): Promise<void> {
    await this.redis.set(
      this.CACHE_KEYS.merchant(id),
      merchant,
      this.CACHE_TTL,
    );
  }
  private async invalidateNormalizationCache(
    originalName: string,
  ): Promise<void> {
    await this.redis.del(this.CACHE_KEYS.normalization(originalName));
  }
  private mapToCreateInput(dto: CreateMerchantDto): Prisma.MerchantCreateInput {
    return {
      originalName: dto.originalName,
      normalizedName: dto.normalizedName,
      category: dto.category,
      subCategory: dto.subCategory,
      confidence: dto.confidence,
      isActive: true,
      flags: [],
    };
  }
  private mapToUpdateInput(
    data: Partial<CreateMerchantDto>,
  ): Prisma.MerchantUpdateInput {
    return {
      normalizedName: data.normalizedName,
      category: data.category,
      subCategory: data.subCategory,
      confidence: data.confidence,
      originalName: data.originalName,
      flags: data.flags ?? [],
    };
  }
  private mapToResponseDto(merchant: MerchantWithCount): MerchantResponseDto {
    return {
      id: merchant.id,
      originalName: merchant.originalName,
      normalizedName: merchant.normalizedName,
      category: merchant.category,
      subCategory: merchant.subCategory ?? undefined,
      confidence: merchant.confidence,
      isActive: merchant.isActive,
      flags: merchant.flags,
      transactionCount: merchant._count.transactions,
      createdAt: merchant.createdAt,
      updatedAt: merchant.updatedAt,
    };
  }
  async searchMerchants(
    params: SearchMerchantsParams,
  ): Promise<SearchMerchantsResult> {
    try {
      const { category, isActive, query, page = 1, limit = 10 } = params;
      const where: Prisma.MerchantWhereInput = {
        AND: [
          ...(category
            ? [
                {
                  OR: [
                    {
                      category: {
                        contains: category,
                        mode: Prisma.QueryMode.insensitive,
                      },
                    },
                    {
                      subCategory: {
                        contains: category,
                        mode: Prisma.QueryMode.insensitive,
                      },
                    },
                  ],
                },
              ]
            : []),
          ...(typeof isActive === 'boolean' ? [{ isActive }] : []),
          ...(query
            ? [
                {
                  OR: [
                    {
                      originalName: {
                        contains: query,
                        mode: Prisma.QueryMode.insensitive,
                      },
                    },
                    {
                      normalizedName: {
                        contains: query,
                        mode: Prisma.QueryMode.insensitive,
                      },
                    },
                  ],
                },
              ]
            : []),
        ].filter(Boolean) as Prisma.MerchantWhereInput[],
      };
      const total = await this.prisma.merchant.count({ where });
      const merchants = await this.prisma.merchant.findMany({
        where,
        include: {
          _count: {
            select: { transactions: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
      });
      const totalPages = Math.ceil(total / limit);
      const cacheKey = `merchants:search:${JSON.stringify(params)}`;
      const response = {
        items: merchants.map((merchant) => this.mapToResponseDto(merchant)),
        total,
        page,
        limit,
        totalPages,
      };
      await this.redis.set(cacheKey, response, 300);
      this.logger.debug(
        `Found ${total} merchants matching search criteria. Page ${page}/${totalPages}`,
      );
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to search merchants: ${message}`);
      throw error;
    }
  }
  private async applyMerchantRules(description: string): Promise<{
    normalizedName: string;
    category: string;
    subCategory?: string;
    confidence: number;
  } | null> {
    try {
      const cacheKey = `merchant:rules:${description}`;
      const cached = await this.redis.get<any>(cacheKey);
      if (cached) return cached;
      const rules = await this.merchantRuleService.getRulesByMerchant();
      for (const rule of rules) {
        try {
          const pattern = new RegExp(rule.pattern, 'i');
          if (pattern.test(description)) {
            const result = {
              normalizedName: rule.normalizedName,
              category: rule.category,
              subCategory: rule.subCategory || undefined,
              confidence: rule.confidence,
            };
            // Sonucu cache'le
            await this.redis.set(cacheKey, result, 3600);
            return result;
          }
        } catch (error) {
          this.logger.warn(
            `Invalid pattern in rule ${rule.id}: ${error.message}`,
          );
          continue;
        }
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to apply merchant rules: ${error.message}`);
      return null;
    }
  }
}
