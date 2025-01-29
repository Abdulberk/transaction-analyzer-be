// src/queue/publishers/transaction.publisher.ts
import { Injectable } from '@nestjs/common';
import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service';

@Injectable()
export class TransactionPublisher {
  constructor(private readonly rabbitmq: RabbitMQService) {}

  async publishTransactionCreated(transactionId: string): Promise<void> {
    await this.rabbitmq.publishTransactionCreated(transactionId);
  }

  async publishTransactionAnalyzed(
    transactionId: string,
    analysis: Record<string, unknown>,
  ): Promise<void> {
    await this.rabbitmq.publishTransactionAnalyzed(transactionId, analysis);
  }
}
