// src/infrastructure/rabbitmq/rabbitmq.service.ts
import { Injectable } from '@nestjs/common';
import { RabbitMQRepository } from './rabbitmq.repository';
import { PatternType, Frequency } from '@prisma/client';

export interface MerchantEvent extends Record<string, unknown> {
  merchantId: string;
  normalizedName: string;
  category?: string;
  timestamp: string;
}

export interface PatternEvent extends Record<string, unknown> {
  patternId: string;
  merchantId: string;
  type: PatternType;
  frequency: Frequency;
  confidence: number;
  timestamp: string;
}

@Injectable()
export class RabbitMQService {
  constructor(private readonly rabbitMQRepository: RabbitMQRepository) {}

  // Transaction Events
  async publishTransactionCreated(transactionId: string): Promise<void> {
    await this.rabbitMQRepository.publish(
      'transaction.exchange',
      'transaction.created',
      {
        transactionId,
        timestamp: new Date().toISOString(),
      },
    );
  }

  async publishTransactionAnalyzed(
    transactionId: string,
    analysis: Record<string, unknown>,
  ): Promise<void> {
    await this.rabbitMQRepository.publish(
      'transaction.exchange',
      'transaction.analyzed',
      {
        transactionId,
        analysis,
        timestamp: new Date().toISOString(),
      },
    );
  }

  // Merchant Events
  async publishMerchantCreated(
    data: Omit<MerchantEvent, 'timestamp'>,
  ): Promise<void> {
    await this.rabbitMQRepository.publish(
      'merchant.exchange',
      'merchant.created',
      {
        ...data,
        timestamp: new Date().toISOString(),
      },
    );
  }

  async publishMerchantUpdated(
    data: Omit<MerchantEvent, 'timestamp'>,
  ): Promise<void> {
    await this.rabbitMQRepository.publish(
      'merchant.exchange',
      'merchant.updated',
      {
        ...data,
        timestamp: new Date().toISOString(),
      },
    );
  }

  async publishMerchantDeactivated(
    data: Pick<MerchantEvent, 'merchantId' | 'normalizedName'>,
  ): Promise<void> {
    await this.rabbitMQRepository.publish(
      'merchant.exchange',
      'merchant.deactivated',
      {
        ...data,
        timestamp: new Date().toISOString(),
      },
    );
  }

  async publishMerchantNormalized(
    merchantId: string,
    normalizedName: string,
  ): Promise<void> {
    await this.rabbitMQRepository.publish(
      'merchant.exchange',
      'merchant.normalized',
      {
        merchantId,
        normalizedName,
        timestamp: new Date().toISOString(),
      },
    );
  }

  // Pattern Events
  async publishPatternDetected(
    data: Omit<PatternEvent, 'timestamp'>,
  ): Promise<void> {
    await this.rabbitMQRepository.publish(
      'pattern.exchange',
      'pattern.detected',
      {
        ...data,
        timestamp: new Date().toISOString(),
      },
    );
  }

  async publishPatternUpdated(
    data: Omit<PatternEvent, 'timestamp'>,
  ): Promise<void> {
    await this.rabbitMQRepository.publish(
      'pattern.exchange',
      'pattern.updated',
      {
        ...data,
        timestamp: new Date().toISOString(),
      },
    );
  }

  // Consumers
  async setupTransactionConsumers(
    onTransactionCreated: (transactionId: string) => Promise<void>,
    onTransactionAnalyzed: (data: {
      transactionId: string;
      analysis: Record<string, unknown>;
    }) => Promise<void>,
  ): Promise<void> {
    await this.rabbitMQRepository.consume<{ transactionId: string }>(
      'transaction.analysis',
      async (message) => {
        await onTransactionCreated(message.transactionId);
      },
    );

    await this.rabbitMQRepository.consume<{
      transactionId: string;
      analysis: Record<string, unknown>;
    }>('transaction.analyzed', async (message) => {
      await onTransactionAnalyzed(message);
    });
  }

  async setupMerchantConsumers(
    onMerchantCreated: (data: MerchantEvent) => Promise<void>,
    onMerchantUpdated: (data: MerchantEvent) => Promise<void>,
    onMerchantDeactivated: (
      data: Pick<MerchantEvent, 'merchantId'>,
    ) => Promise<void>,
  ): Promise<void> {
    await this.rabbitMQRepository.consume<MerchantEvent>(
      'merchant.created',
      async (message) => {
        await onMerchantCreated(message);
      },
    );

    await this.rabbitMQRepository.consume<MerchantEvent>(
      'merchant.updated',
      async (message) => {
        await onMerchantUpdated(message);
      },
    );

    await this.rabbitMQRepository.consume<Pick<MerchantEvent, 'merchantId'>>(
      'merchant.deactivated',
      async (message) => {
        await onMerchantDeactivated(message);
      },
    );
  }

  async setupPatternConsumers(
    onPatternDetected: (data: PatternEvent) => Promise<void>,
    onPatternUpdated: (data: PatternEvent) => Promise<void>,
  ): Promise<void> {
    await this.rabbitMQRepository.consume<PatternEvent>(
      'pattern.detected',
      async (message) => {
        await onPatternDetected(message);
      },
    );

    await this.rabbitMQRepository.consume<PatternEvent>(
      'pattern.updated',
      async (message) => {
        await onPatternUpdated(message);
      },
    );
  }
}
