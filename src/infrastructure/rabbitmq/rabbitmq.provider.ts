// src/infrastructure/rabbitmq/rabbitmq.provider.ts
import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, Channel, connect } from 'amqplib';

export interface RabbitMQConnection {
  connection: Connection;
  channel: Channel;
}

const EXCHANGES = {
  TRANSACTION: 'transaction.exchange',
  MERCHANT: 'merchant.exchange',
  PATTERN: 'pattern.exchange',
} as const;

const QUEUES = {
  TRANSACTION_ANALYSIS: 'transaction.analysis',
  MERCHANT_NORMALIZATION: 'merchant.normalization',
  PATTERN_DETECTION: 'pattern.detection',
} as const;

export const rabbitmqConnectionFactory: FactoryProvider<
  Promise<RabbitMQConnection>
> = {
  provide: 'RabbitMQConnection',
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService,
  ): Promise<RabbitMQConnection> => {
    const connection = await connect(
      configService.get<string>('RABBIT_MQ_URI')!,
    );
    const channel = await connection.createChannel();

    // Setup exchanges
    for (const exchange of Object.values(EXCHANGES)) {
      await channel.assertExchange(exchange, 'topic', { durable: true });
    }

    // Setup queues
    for (const queue of Object.values(QUEUES)) {
      await channel.assertQueue(queue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': `${queue}.dlx`,
          'x-dead-letter-routing-key': `${queue}.dead`,
        },
      });
    }

    // Setup dead letter exchanges and queues
    for (const queue of Object.values(QUEUES)) {
      const dlx = `${queue}.dlx`;
      const dlq = `${queue}.dlq`;

      await channel.assertExchange(dlx, 'topic', { durable: true });
      await channel.assertQueue(dlq, { durable: true });
      await channel.bindQueue(dlq, dlx, '#');
    }

    return { connection, channel };
  },
};
