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
}

@Injectable()
export class PatternService {
  private readonly logger = new Logger(PatternService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly merchantService: MerchantService,
    private readonly openai: OpenAIService,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  async detectPatterns(dto: DetectPatternDto): Promise<PatternResponseDto[]> {
    try {
      const patterns = await this.analyzeTransactions(dto.transactions);
      const savedPatterns = await this.savePatterns(patterns);

      for (const pattern of savedPatterns) {
        await this.publishPatternDetectionEvents([pattern]);
      }

      return savedPatterns.map((pattern) => this.mapToResponseDto(pattern));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to detect patterns: ${message}`);
      throw error;
    }
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
        const frequency = this.detectFrequency(transactions);
        const aiAnalysis = await this.performAIAnalysis(transactions);
        const confidence = this.calculateConfidence(transactions);

        const averageAmount =
          transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) /
          transactions.length;

        return [
          {
            type: aiAnalysis.type,
            merchantId,
            amount: averageAmount,
            frequency: frequency || Frequency.IRREGULAR,
            confidence,
            nextExpectedDate: this.predictNextDate(transactions),
            description: aiAnalysis.description,
          },
        ];
      }
      return [];
    } catch (error) {
      this.logger.error(
        `Failed to analyze transactions for merchant ${merchantId}:`,
        error,
      );
      return [];
    }
  }

  private async performAIAnalysis(
    transactions: TransactionForPatternDto[],
  ): Promise<{ type: PatternType; description: string }> {
    const prompt = `Analyze these transactions and determine the pattern type:
      Transactions: ${JSON.stringify(transactions, null, 2)}
  
      Rules:
      1. SUBSCRIPTION: Fixed amount, regular interval (e.g., Netflix monthly)
      2. RECURRING: Variable amount, regular interval (e.g., Uber weekly rides)
      3. PERIODIC: Any other regular pattern
  
      Consider:
      - Amount consistency
      - Time intervals
      - Transaction frequency
      - Merchant type
  
      Respond in exactly this format:
      Type: [SUBSCRIPTION/RECURRING/PERIODIC]
      Description: [detailed pattern description]`;

    try {
      const response = await this.openai.analyze(prompt);
      const lines = response.split('\n');

      const type =
        lines
          .find((l) => l.startsWith('Type:'))
          ?.split(':')[1]
          ?.trim() || 'PERIODIC';

      const description =
        lines
          .find((l) => l.startsWith('Description:'))
          ?.split(':')[1]
          ?.trim() || '';

      return {
        type: this.mapAIResponseToPatternType(type),
        description,
      };
    } catch (error) {
      this.logger.error('AI analysis failed:', error);
      return {
        type: PatternType.PERIODIC,
        description: 'Pattern analysis failed',
      };
    }
  }

  private mapAIResponseToPatternType(type: string): PatternType {
    const normalizedType = type.toUpperCase();
    if (Object.values(PatternType).includes(normalizedType as PatternType)) {
      return normalizedType as PatternType;
    }
    return PatternType.PERIODIC;
  }

  private detectFrequency(transactions: TransactionForPatternDto[]): Frequency {
    if (transactions.length < 2) return Frequency.IRREGULAR;

    const intervals = this.calculateIntervals(transactions);
    const averageInterval = this.calculateAverageInterval(intervals);

    if (averageInterval >= 6 && averageInterval <= 9) return Frequency.WEEKLY;
    if (averageInterval >= 13 && averageInterval <= 16)
      return Frequency.BIWEEKLY;
    if (averageInterval >= 27 && averageInterval <= 32)
      return Frequency.MONTHLY;
    if (averageInterval >= 85 && averageInterval <= 95)
      return Frequency.QUARTERLY;
    if (averageInterval >= 350 && averageInterval <= 380)
      return Frequency.YEARLY;

    return Frequency.IRREGULAR;
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

  private calculateAverageInterval(intervals: number[]): number {
    return (
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
    );
  }

  private calculateConfidence(
    transactions: TransactionForPatternDto[],
  ): number {
    const intervals = this.calculateIntervals(transactions);
    if (intervals.length < 1) return 0;

    const averageInterval = this.calculateAverageInterval(intervals);
    const variance =
      intervals.reduce(
        (acc, interval) => acc + Math.pow(interval - averageInterval, 2),
        0,
      ) / intervals.length;

    const maxAllowedVariance = Math.pow(averageInterval * 0.2, 2);
    const confidence = Math.max(
      0,
      Math.min(1, 1 - variance / maxAllowedVariance),
    );

    return Number(confidence.toFixed(2));
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
  ): Promise<Array<Prisma.PatternGetPayload<{}>>> {
    try {
      const savedPatterns: Array<Prisma.PatternGetPayload<{}>> = [];

      for (const pattern of patterns) {
        const merchant = await this.prisma.merchant.findFirst({
          where: { id: pattern.merchantId },
        });

        if (merchant) {
          const saved = await this.prisma.pattern.create({
            data: {
              type: pattern.type,
              merchant: {
                connect: { id: pattern.merchantId },
              },
              amount: new Prisma.Decimal(pattern.amount),
              frequency: pattern.frequency,
              confidence: pattern.confidence,
              nextExpectedDate: pattern.nextExpectedDate,
              description: pattern.description,
            },
          });

          savedPatterns.push(saved);
          await this.invalidatePatternCache(pattern.merchantId);
        }
      }

      return savedPatterns;
    } catch (error) {
      this.logger.error('Failed to save patterns:', error);
      throw error;
    }
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

        const aiAnalysis = await this.performAIAnalysis(transactions);
        const frequency = this.detectFrequency(transactions);
        const nextExpectedDate = this.predictNextDate(transactions);

        const amounts = transactions.map((t) => Math.abs(t.amount));
        const isFixedAmount = new Set(amounts).size === 1;
        const amount = isFixedAmount
          ? amounts[0]
          : Number(
              (amounts.reduce((a, b) => a + b, 0) / amounts.length).toFixed(2),
            );

        patterns.push({
          type: aiAnalysis.type.toLowerCase(),
          merchant: merchantName,
          amount,
          frequency: frequency.toLowerCase(),
          confidence: this.calculateConfidence(transactions),
          next_expected: nextExpectedDate?.toISOString().split('T')[0],
          notes: aiAnalysis.description,
        });
      }

      return { patterns };
    } catch (error) {
      this.logger.error('Failed to analyze transaction patterns:', error);
      throw error;
    }
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
          merchant: true 
        },
        orderBy: [
          { confidence: 'desc' },
          { createdAt: 'desc' }
        ]
      });
  
      const response = patterns.map(pattern => ({
        ...this.mapToResponseDto(pattern),
        merchantName: pattern.merchant.normalizedName 
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
