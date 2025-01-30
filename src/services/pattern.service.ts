// src/services/pattern.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './base/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { MerchantService } from './merchant.service';
import { OpenAIService } from 'src/infrastructure/openai/openai.service';
import { RabbitMQService } from '../infrastructure/rabbitmq/rabbitmq.service';
import { Prisma, PatternType, Frequency } from '@prisma/client';
import type { PatternResponseDto } from 'src/dto/pattern/pattern-response.dto';
import type {
  TransactionForPatternDto,
  DetectPatternDto,
  PatternAnalysisResponseDto,
  PatternAnalysisRequestDto,
} from 'src/dto/pattern/detect-pattern.dto';
import { CACHE_KEYS } from 'src/infrastructure/redis/constants/cache-keys';
import { CACHE_TTL } from 'src/infrastructure/redis/constants/cache-ttl';
interface PatternAnalysis {
  type: PatternType;
  merchantId: string;
  amount: number;
  frequency: Frequency;
  confidence: number;
  nextExpectedDate?: Date;
  description?: string;
  transactionCount?: number;
  averageInterval?: number;
}

@Injectable()
export class PatternService {
  private readonly logger = new Logger(PatternService.name);
  private readonly TRANSACTION_TIMEOUT = 30000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly merchantService: MerchantService,
    private readonly rabbitmq: RabbitMQService,
    private readonly openai: OpenAIService,
  ) {}

  async detectPatterns(dto: DetectPatternDto): Promise<PatternResponseDto[]> {
    return await this.prisma.$transaction(
      async (prisma) => {
        try {
          const patterns = await this.analyzeTransactions(dto.transactions);
          const savedPatterns = await this.savePatterns(patterns, prisma);

          await this.publishPatternDetectionEvents(savedPatterns);

          return savedPatterns.map((pattern) => this.mapToResponseDto(pattern));
        } catch (error) {
          this.logger.error('Pattern detection failed:', error);
          throw error;
        }
      },
      {
        timeout: this.TRANSACTION_TIMEOUT,
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );
  }

  async getPatternsByMerchant(
    merchantId: string,
  ): Promise<PatternResponseDto[]> {
    try {
      const cached = await this.redis.get<PatternResponseDto[]>(
        CACHE_KEYS.PATTERNS.byMerchant(merchantId),
      );

      if (cached) {
        this.logger.debug(`Cache hit for merchant patterns: ${merchantId}`);
        return cached;
      }

      const patterns = await this.prisma.pattern.findMany({
        where: { merchantId },
        orderBy: { confidence: 'desc' },
      });

      const response = patterns.map((pattern) =>
        this.mapToResponseDto(pattern),
      );
      await this.redis.set(
        CACHE_KEYS.PATTERNS.byMerchant(merchantId),
        response,
        CACHE_TTL.LONG,
      );

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get patterns for merchant ${merchantId}: ${message}`,
      );
      throw error;
    }
  }

  private async analyzeTransactions(
    transactions: TransactionForPatternDto[],
  ): Promise<PatternAnalysis[]> {
    const patterns: PatternAnalysis[] = [];
    const groupedByMerchant =
      await this.groupTransactionsByMerchant(transactions);

    for (const [
      merchantId,
      merchantTransactions,
    ] of groupedByMerchant.entries()) {
      const merchantPatterns = await this.analyzeTransactionsForMerchant(
        merchantId,
        merchantTransactions,
      );
      patterns.push(...merchantPatterns);
    }

    return patterns;
  }

  private async groupTransactionsByMerchant(
    transactions: TransactionForPatternDto[],
  ): Promise<Map<string, TransactionForPatternDto[]>> {
    const groups = new Map<string, TransactionForPatternDto[]>();

    for (const transaction of transactions) {
      try {
        const normalized = await this.merchantService.normalizeMerchant({
          description: transaction.description,
        });

        const merchant = await this.prisma.merchant.findFirst({
          where: { normalizedName: normalized.normalizedName },
        });

        if (merchant) {
          const group = groups.get(merchant.id) || [];
          group.push(transaction);
          groups.set(merchant.id, group);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to process transaction for merchant grouping: ${transaction.description}`,
          error,
        );
      }
    }

    return groups;
  }
  private async analyzeTransactionsForMerchant(
    merchantId: string,
    transactions: TransactionForPatternDto[],
  ): Promise<PatternAnalysis[]> {
    try {
      if (transactions.length >= 2) {
        const aiAnalysis = await this.openai.analyzePattern(transactions);
        const intervals = this.calculateIntervals(transactions);
        
        return [{
          type: aiAnalysis.type as PatternType,
          merchantId,
          amount: this.calculateAverageAmount(transactions),
          frequency: this.detectFrequency(intervals),
          confidence: aiAnalysis.confidence,
          nextExpectedDate: this.predictNextDate(transactions),
          description: aiAnalysis.description, 
          transactionCount: transactions.length,
          averageInterval: this.calculateAverageInterval(intervals)
        }];
      }
      return [];
    } catch (error) {
      this.logger.error(`Analysis failed for merchant ${merchantId}:`, error);
      return [];
    }
  }

  private detectFrequency(intervals: number[]): Frequency {
    if (intervals.length < 2) return Frequency.MONTHLY;

    const averageInterval = this.calculateAverageInterval(intervals);

    if (averageInterval >= 28 && averageInterval <= 32) {
      return Frequency.MONTHLY;
    } else if (averageInterval >= 12 && averageInterval <= 16) {
      return Frequency.BIWEEKLY;
    } else if (averageInterval >= 5 && averageInterval <= 9) {
      return Frequency.WEEKLY;
    }

    return Frequency.MONTHLY;
  }

  private calculateAverageInterval(intervals: number[]): number {
    return (
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
    );
  }

  private calculateIntervals(
    transactions: TransactionForPatternDto[],
  ): number[] {
    const sortedDates = transactions
      .map((t) => new Date(t.date))
      .sort((a, b) => a.getTime() - b.getTime());

    const intervals: number[] = [];
    for (let i = 1; i < sortedDates.length; i++) {
      const days = Math.round(
        (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) /
          (1000 * 60 * 60 * 24),
      );
      intervals.push(days);
    }

    return intervals;
  }

  private predictNextDate(
    transactions: TransactionForPatternDto[],
  ): Date | undefined {
    if (transactions.length < 2) return undefined;

    const intervals = this.calculateIntervals(transactions);
    const averageInterval = this.calculateAverageInterval(intervals);
    const lastDate = new Date(
      Math.max(...transactions.map((t) => new Date(t.date).getTime())),
    );

    return new Date(lastDate.getTime() + averageInterval * 24 * 60 * 60 * 1000);
  }

  private async savePatterns(
    patterns: PatternAnalysis[],
    prisma: Prisma.TransactionClient,
  ): Promise<Array<Prisma.PatternGetPayload<object>>> {
    const savedPatterns: Array<Prisma.PatternGetPayload<object>> = [];
    for (const pattern of patterns) {
      const merchant = await prisma.merchant.findFirst({
        where: { id: pattern.merchantId },
      });
      if (merchant) {
        const saved = await prisma.pattern.create({
          data: {
            type: pattern.type,
            merchant: {
              connect: { id: pattern.merchantId },
            },
            amount: new Prisma.Decimal(pattern.amount),
            frequency: pattern.frequency,
            confidence: pattern.confidence,
            nextExpectedDate: pattern.nextExpectedDate,
            description: pattern.description || null,
            lastOccurrence: new Date(), 
            metadata: {
            
              analysisDate: new Date(),
              transactionCount: pattern.transactionCount,
              averageInterval: pattern.averageInterval,
              detectedPattern: {
                type: pattern.type,
                description: pattern.description,
                confidence: pattern.confidence
              }
            } as Prisma.InputJsonValue
          },
        });
        savedPatterns.push(saved);
        await this.invalidatePatternCache(pattern.merchantId);
      }
    }
    return savedPatterns;
  }

  private async invalidatePatternCache(merchantId: string): Promise<void> {
    await this.redis.del(CACHE_KEYS.PATTERNS.byMerchant(merchantId));
  }

  private async publishPatternDetectionEvents(
    patterns: Array<Prisma.PatternGetPayload<{}>>,
  ): Promise<void> {
    for (const pattern of patterns) {
      await this.rabbitmq.publishPatternDetected({
        patternId: pattern.id,
        merchantId: pattern.merchantId,
        type: pattern.type,
        frequency: pattern.frequency,
        confidence: pattern.confidence,
      });
    }
  }

  private mapToResponseDto(
    pattern: Prisma.PatternGetPayload<{}>,
  ): PatternResponseDto {
    return {
      id: pattern.id,
      type: pattern.type,
      merchantId: pattern.merchantId,
      amount: Number(pattern.amount),
      frequency: pattern.frequency,
      confidence: pattern.confidence,
      nextExpectedDate: pattern.nextExpectedDate ?? undefined,
      description: pattern.description ?? undefined,
      createdAt: pattern.createdAt,
      updatedAt: pattern.updatedAt,
    };
  }

  async analyzeTransactionPatterns(
    dto: PatternAnalysisRequestDto,
  ): Promise<PatternAnalysisResponseDto> {
    try {
      const groupedTransactions = this.groupByMerchant(dto.transactions);
      const patterns: any[] = [];

      for (const [merchantName, transactions] of Object.entries(
        groupedTransactions,
      )) {
        if (transactions.length < 2) continue;

        const aiAnalysis = await this.openai.analyzePattern(transactions);
        const frequency = this.detectFrequency(
          this.calculateIntervals(transactions),
        );
        const nextExpectedDate = this.predictNextDate(transactions);

        patterns.push({
          type: aiAnalysis.type.toLowerCase(),
          merchant: merchantName,
          amount: this.calculateAverageAmount(transactions),
          frequency: frequency.toLowerCase(),
          confidence: aiAnalysis.confidence,
          next_expected: nextExpectedDate?.toISOString().split('T')[0],
          description: aiAnalysis.description,
        });
      }

      return { patterns };
    } catch (error) {
      this.logger.error('Failed to analyze transaction patterns:', error);
      throw error;
    }
  }

  private calculateAverageAmount(
    transactions: TransactionForPatternDto[],
  ): number {
    const amounts = transactions.map((t) => Math.abs(t.amount));
    return Number(
      (amounts.reduce((a, b) => a + b) / amounts.length).toFixed(2),
    );
  }

  private groupByMerchant(transactions: TransactionForPatternDto[]) {
    return transactions.reduce(
      (acc, transaction) => {
        const merchant = transaction.description;
        if (!acc[merchant]) {
          acc[merchant] = [];
        }
        acc[merchant].push(transaction);
        return acc;
      },
      {} as Record<string, TransactionForPatternDto[]>,
    );
  }

  async getAllPatterns(): Promise<PatternResponseDto[]> {
    try {
      const cacheKey = CACHE_KEYS.PATTERNS.all;
      const cached = await this.redis.get<PatternResponseDto[]>(cacheKey);

      if (cached) {
        this.logger.debug('Cache hit for all patterns');
        return cached;
      }

      const patterns = await this.prisma.pattern.findMany({
        include: {
          merchant: true,
        },
        orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
      });

      const response = patterns.map((pattern) => ({
        ...this.mapToResponseDto(pattern),
        merchantName: pattern.merchant.normalizedName,
      }));

      await this.redis.set(cacheKey, response, CACHE_TTL.LONG);

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get all patterns: ${message}`);
      throw error;
    }
  }
}
