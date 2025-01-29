// src/queue/consumers/transaction.consumer.ts
import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service';
import { TransactionEventHandler } from '../../events/handlers/transaction.handler';

@Injectable()
export class TransactionConsumer {
  private readonly logger = new Logger(TransactionConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly transactionHandler: TransactionEventHandler,
  ) {
    this.setupConsumers();
  }

  private async setupConsumers() {
    await this.rabbitmq.setupTransactionConsumers(
      // Transaction Created Consumer
      async (transactionId: string) => {
        try {
          await this.transactionHandler.onTransactionCreated(transactionId);
        } catch (error) {
          this.logger.error(
            `Error processing transaction created: ${error.message}`,
          );
        }
      },
      // Transaction Analyzed Consumer
      async (data: {
        transactionId: string;
        analysis: Record<string, unknown>;
      }) => {
        try {
          await this.transactionHandler.onTransactionAnalyzed(data);
        } catch (error) {
          this.logger.error(
            `Error processing transaction analysis: ${error.message}`,
          );
        }
      },
    );
  }
}
