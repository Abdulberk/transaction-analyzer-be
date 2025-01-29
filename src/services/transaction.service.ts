// src/services/transaction.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './base/prisma.service';
import { RabbitMQService } from '../infrastructure/rabbitmq/rabbitmq.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { Frequency, PatternType, Prisma } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import {
  CombinedAnalysisResponseDto,
  CreateTransactionDto,
  TransactionListItemDto,
  TransactionListResponseDto,
  TransactionResponseDto,
  UploadTransactionResponseDto,
} from 'src/dto/transaction';
import { MerchantService } from './merchant.service';
import { MerchantMetadata } from 'src/types/metadata.types';
import { PatternService } from './pattern.service';
import {
  GetTransactionsQueryDto,
  SortOrder,
  TransactionSortBy,
} from 'src/dto/transaction/get-transactions.dto';
import { CACHE_KEYS } from 'src/infrastructure/redis/constants/cache-keys';
import { CACHE_TTL } from 'src/infrastructure/redis/constants/cache-ttl';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
    private readonly redis: RedisService,
    private readonly merchantService: MerchantService,
    private readonly patternService: PatternService,
  ) {}

  async createTransaction(
    dto: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    try {
      const merchantAnalysis = await this.merchantService.normalizeMerchant({
        description: dto.description,
      });

      let merchant = await this.prisma.merchant.findFirst({
        where: { normalizedName: merchantAnalysis.normalizedName },
      });

      if (!merchant) {
        const merchantMetadata = {
          aiAnalysis: {
            normalizedName: merchantAnalysis.normalizedName,
            category: merchantAnalysis.category,
            subCategory: merchantAnalysis.subCategory,
            confidence: merchantAnalysis.confidence,
            flags: merchantAnalysis.flags,
          },
          createdAt: new Date().toISOString(),
        };

        merchant = await this.prisma.merchant.create({
          data: {
            originalName: dto.description,
            normalizedName: merchantAnalysis.normalizedName,
            category: merchantAnalysis.category,
            subCategory: merchantAnalysis.subCategory ?? null,
            confidence: merchantAnalysis.confidence,
            flags: merchantAnalysis.flags,
            metadata: merchantMetadata as Prisma.InputJsonValue,
          },
        });

        await this.rabbitmq.publishMerchantCreated({
          merchantId: merchant.id,
          normalizedName: merchant.normalizedName,
          category: merchant.category,
        });
      }

      const transaction = await this.prisma.transaction.create({
        data: {
          description: dto.description,
          amount: new Prisma.Decimal(dto.amount),
          date: new Date(dto.date),
          merchant: { connect: { id: merchant.id } },
          category: merchantAnalysis.category,
          subCategory: merchantAnalysis.subCategory ?? null,
          confidence: merchantAnalysis.confidence,
          isSubscription: merchantAnalysis.flags.includes('Recurring'),
          flags: merchantAnalysis.flags,
          isAnalyzed: true,
        },
        include: { merchant: true },
      });

      await this.rabbitmq.publishTransactionCreated(transaction.id);

      return this.mapToResponseDto(transaction);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create transaction: ${message}`);
      throw error;
    }
  }
  async getAnalyzedTransaction(
    id: string,
  ): Promise<TransactionResponseDto | null> {
    try {
      const cached = await this.getFromCache(id);
      if (cached) return this.mapToResponseDto(cached);

      const transaction = await this.getFromDatabase(id);
      if (!transaction) return null;

      const response = this.mapToResponseDto(transaction);
      await this.cacheTransaction(id, transaction);

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get analyzed transaction: ${id} - ${message}`,
      );
      throw error;
    }
  }

  async processTransactionFile(
    file: Express.Multer.File,
  ): Promise<UploadTransactionResponseDto> {
    try {
      const records = parse(file.buffer.toString(), {
        columns: true,
        skip_empty_lines: true,
      });

      const transactions = records.map((record: any) => ({
        description: record.description,
        amount: Number(record.amount),
        date: record.date,
      }));

      const analysis = await this.analyzeTransactions({ transactions });

      const savedResources = {
        merchants: [] as Array<{ id: string; normalizedName: string }>,
        transactions: [] as Array<{ id: string; description: string }>,
        patterns: [] as Array<{ id: string; type: string; merchant: string }>,
      };

      for (const transaction of analysis.normalized_transactions) {
        const normalized = transaction.normalized;

        let merchant = await this.prisma.merchant.findFirst({
          where: { normalizedName: normalized.merchant },
        });

        if (!merchant) {
          merchant = await this.prisma.merchant.create({
            data: {
              originalName: transaction.original,
              normalizedName: normalized.merchant,
              category: normalized.category,
              subCategory: normalized.sub_category,
              confidence: normalized.confidence,
              flags: normalized.flags,
              isActive: true,
            },
          });
          savedResources.merchants.push({
            id: merchant.id,
            normalizedName: merchant.normalizedName,
          });

          this.logger.debug(
            `New merchant created: ${merchant.id} - ${merchant.normalizedName}`,
          );
        }

        const transactionData = transactions.find(
          (t) => t.description === transaction.original,
        );
        if (transactionData) {
          const savedTransaction = await this.prisma.transaction.create({
            data: {
              description: transaction.original,
              amount: new Prisma.Decimal(transactionData.amount),
              date: new Date(transactionData.date),
              merchantId: merchant.id,
              category: normalized.category,
              subCategory: normalized.sub_category,
              confidence: normalized.confidence,
              isSubscription: normalized.is_subscription,
              flags: normalized.flags,
              isAnalyzed: true,
              analyzedAt: new Date(),
            },
          });
          savedResources.transactions.push({
            id: savedTransaction.id,
            description: savedTransaction.description,
          });

          this.logger.debug(
            `Transaction saved: ${savedTransaction.id} for merchant ${merchant.normalizedName}`,
          );
        }
      }

      for (const pattern of analysis.detected_patterns) {
        const normalizedMerchant = analysis.normalized_transactions.find(
          (t) => t.original === pattern.merchant,
        )?.normalized.merchant;

        if (!normalizedMerchant) {
          this.logger.warn(
            `Could not find normalized merchant for pattern: ${pattern.merchant}`,
          );
          continue;
        }

        const merchant = await this.prisma.merchant.findFirst({
          where: { normalizedName: normalizedMerchant },
        });

        if (merchant) {
          const savedPattern = await this.prisma.pattern.create({
            data: {
              type: pattern.type.toUpperCase() as PatternType,
              merchantId: merchant.id,
              amount: new Prisma.Decimal(pattern.amount),
              frequency: pattern.frequency.toUpperCase() as Frequency,
              confidence: pattern.confidence,
              nextExpectedDate: pattern.next_expected
                ? new Date(pattern.next_expected)
                : null,
              description: pattern.notes,
            },
          });

          savedResources.patterns.push({
            id: savedPattern.id,
            type: pattern.type,
            merchant: normalizedMerchant,
          });

          this.logger.debug(
            `Pattern saved for merchant ${normalizedMerchant}: ${savedPattern.id}`,
          );
        } else {
          this.logger.warn(
            `Merchant not found for pattern: ${normalizedMerchant}`,
          );
        }
      }

      // Event'leri yayınla
      await this.publishEvents(savedResources);

      return {
        normalized_transactions: analysis.normalized_transactions,
        detected_patterns: analysis.detected_patterns,
        processedCount: transactions.length,
        failedCount: 0,
        errors: [],
        savedResources,
      };
    } catch (error) {
      this.logger.error('Failed to process CSV file:', error);
      throw new Error(`Failed to process CSV file: ${error.message}`);
    }
  }

  private async publishEvents(savedResources: {
    merchants: Array<{ id: string; normalizedName: string }>;
    transactions: Array<{ id: string; description: string }>;
    patterns: Array<{ id: string; type: string; merchant: string }>;
  }) {
    try {
      for (const merchant of savedResources.merchants) {
        await this.rabbitmq.publishMerchantCreated({
          merchantId: merchant.id,
          normalizedName: merchant.normalizedName,
          category: 'AUTO_DETECTED',
        });
      }

      for (const transaction of savedResources.transactions) {
        await this.rabbitmq.publishTransactionCreated(transaction.id);
      }

      for (const pattern of savedResources.patterns) {
        await this.rabbitmq.publishPatternDetected({
          patternId: pattern.id,
          merchantId: pattern.merchant,
          type: pattern.type as PatternType,
          frequency: Frequency.MONTHLY,
          confidence: 1,
        });
      }
    } catch (error) {
      this.logger.error('Failed to publish events:', error);
    }
  }

  private async getFromCache(id: string): Promise<Prisma.TransactionGetPayload<{
    include: { merchant: true };
  }> | null> {
    return this.redis.get(CACHE_KEYS.TRANSACTIONS.single(id));
  }

  private async getFromDatabase(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { merchant: true },
    });

    if (!transaction?.isAnalyzed) {
      throw new Error('Transaction not analyzed');
    }

    return transaction;
  }

  private async cacheTransaction(
    id: string,
    transaction: Prisma.TransactionGetPayload<{ include: { merchant: true } }>,
  ): Promise<void> {
    await this.redis.set(
      CACHE_KEYS.TRANSACTIONS.single(id),
      transaction,
      CACHE_TTL.MEDIUM,
    );
  }

  private mapToResponseDto(
    transaction: Prisma.TransactionGetPayload<{ include: { merchant: true } }>,
  ): TransactionResponseDto {
    return {
      id: transaction.id,
      description: transaction.description,
      amount: Number(transaction.amount),
      date: transaction.date,
      analysis: {
        merchant: transaction.merchant
          ? {
              id: transaction.merchant.id,
              name: transaction.merchant.normalizedName,
              category: transaction.merchant.category,
            }
          : undefined,
        category: transaction.category ?? 'UNKNOWN',
        subCategory: transaction.subCategory ?? undefined,
        confidence: transaction.confidence ?? 1,
        isSubscription: Boolean(transaction.isSubscription),
        flags: Array.isArray(transaction.flags) ? transaction.flags : [],
      },
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

  async analyzeTransactions(dto: {
    transactions: CreateTransactionDto[];
  }): Promise<CombinedAnalysisResponseDto> {
    try {
      const normalizedTransactions = await Promise.all(
        dto.transactions.map(async (transaction) => {
          const normalized = await this.merchantService.normalizeMerchant({
            description: transaction.description,
          });

          return {
            original: transaction.description,
            normalized: {
              merchant: normalized.normalizedName,
              category: normalized.category,
              sub_category: normalized.subCategory || '',
              confidence: normalized.confidence,
              is_subscription: normalized.flags.includes('subscription'),
              flags: normalized.flags.map((flag) =>
                flag.toLowerCase().replace(' ', '_'),
              ),
            },
          };
        }),
      );

      const patternAnalysis =
        await this.patternService.analyzeTransactionPatterns({
          transactions: dto.transactions.map((t) => ({
            description: t.description,
            amount: t.amount,
            date:
              t.date instanceof Date
                ? t.date.toISOString().split('T')[0]
                : t.date,
          })),
        });

      return {
        normalized_transactions: normalizedTransactions,
        detected_patterns: patternAnalysis.patterns,
      };
    } catch (error) {
      this.logger.error('Failed to analyze transactions:', error);
      throw new Error(`Failed to analyze transactions: ${error.message}`);
    }
  }

  async getTransactions(
    query: GetTransactionsQueryDto,
  ): Promise<TransactionListResponseDto> {
    try {
      const page = Number(query.page || 1);
      const limit = Number(query.limit || 10);
      const sortBy = query.sortBy || TransactionSortBy.DATE;
      const order = query.order || SortOrder.DESC;

      const whereConditions: Prisma.TransactionWhereInput[] = [];

      if (query.merchantId) {
        whereConditions.push({ merchantId: query.merchantId });
      }

      if (query.startDate || query.endDate) {
        whereConditions.push({
          date: {
            ...(query.startDate && { gte: new Date(query.startDate) }),
            ...(query.endDate && { lte: new Date(query.endDate) }),
          },
        });
      }

      if (query.category) {
        whereConditions.push({ category: query.category });
      }

      if (query.search) {
        whereConditions.push({
          OR: [
            {
              description: {
                contains: query.search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              merchant: {
                normalizedName: {
                  contains: query.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          ],
        });
      }

      const where: Prisma.TransactionWhereInput =
        whereConditions.length > 0 ? { AND: whereConditions } : {};

      const orderBy = this.buildOrderBy(sortBy, order);

      const [transactions, total] = await Promise.all([
        this.prisma.transaction.findMany({
          where,
          include: {
            merchant: true,
          },
          skip: Math.max(0, (page - 1) * limit),
          take: limit,
          orderBy,
        }),
        this.prisma.transaction.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        items: transactions.map((transaction) =>
          this.mapTransactionToDto(transaction),
        ),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error('Failed to get transactions:', error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new Error('Invalid query parameters');
      }
      throw new Error('Failed to fetch transactions');
    }
  }

  private buildOrderBy(
    sortBy: TransactionSortBy,
    order: SortOrder,
  ): Prisma.TransactionOrderByWithRelationInput {
    const orderDirection = order.toLowerCase() as Prisma.SortOrder;

    switch (sortBy) {
      case TransactionSortBy.MERCHANT:
        return {
          merchant: {
            normalizedName: orderDirection,
          },
        };
      case TransactionSortBy.DATE:
        return { date: orderDirection };
      case TransactionSortBy.AMOUNT:
        return { amount: orderDirection };
      case TransactionSortBy.CATEGORY:
        return { category: orderDirection };
      default:
        return { date: 'desc' };
    }
  }

  private mapTransactionToDto(
    transaction: Prisma.TransactionGetPayload<{
      include: { merchant: true };
    }>,
  ): TransactionListItemDto {
    if (!transaction.merchant) {
      throw new Error(
        `Transaction ${transaction.id} has no associated merchant`,
      );
    }

    return {
      id: transaction.id,
      description: transaction.description,
      amount: Number(transaction.amount),
      date: transaction.date,
      merchant: {
        id: transaction.merchant.id,
        name: transaction.merchant.normalizedName,
        category: transaction.merchant.category,
      },
      category: transaction.category || 'Uncategorized',
      subCategory: transaction.subCategory || undefined,
      isSubscription: transaction.isSubscription,
      flags: transaction.flags,
    };
  }
}
