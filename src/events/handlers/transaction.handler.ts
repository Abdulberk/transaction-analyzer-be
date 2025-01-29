// src/events/handlers/transaction.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../services/transaction.service';
import { MerchantService } from '../../services/merchant.service';
import { PatternService } from '../../services/pattern.service';
import { RabbitMQService } from 'src/infrastructure/rabbitmq/rabbitmq.service';

@Injectable()
export class TransactionEventHandler {
  private readonly logger = new Logger(TransactionEventHandler.name);

  constructor(
    private readonly transactionService: TransactionService,
    private readonly merchantService: MerchantService,
    private readonly patternService: PatternService,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  async onTransactionCreated(transactionId: string): Promise<void> {
    try {
      const transaction =
        await this.transactionService.getAnalyzedTransaction(transactionId);
      if (!transaction) {
        throw new Error(`Transaction not found: ${transactionId}`);
      }

      // 1. Merchant normalization event'ini tetikle
      const merchantAnalysis = await this.merchantService.normalizeMerchant({
        description: transaction.description,
      });
      await this.rabbitmq.publishMerchantNormalized(
        transaction.id,
        merchantAnalysis.normalizedName,
      );

      // 2. Pattern detection event'ini tetikle
      const patterns = await this.patternService.detectPatterns({
        transactions: [
          {
            description: transaction.description,
            amount: transaction.amount,
            date: transaction.date,
          },
        ],
      });

      // 3. Transaction analyzed event'ini tetikle
      await this.rabbitmq.publishTransactionAnalyzed(transaction.id, {
        merchantAnalysis,
        patterns,
      });
    } catch (error) {
      this.logger.error(
        `Failed to process transaction ${transactionId}`,
        error,
      );
      throw error;
    }
  }

  async onTransactionAnalyzed(data: {
    transactionId: string;
    analysis: Record<string, unknown>;
  }): Promise<void> {
    try {
      const transaction = await this.transactionService.getAnalyzedTransaction(
        data.transactionId,
      );

      if (!transaction) {
        throw new Error(`Transaction not found: ${data.transactionId}`);
      }

      this.logger.debug(
        `Transaction analysis completed: ${data.transactionId}`,
        {
          analysis: data.analysis,
          transaction,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle analyzed transaction ${data.transactionId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
