// src/infrastructure/rabbitmq/rabbitmq.repository.ts
import { Injectable, Inject, OnModuleDestroy, Logger } from '@nestjs/common';
import { Channel, Connection, Message } from 'amqplib';
import { RabbitMQException } from './exceptions/rabbitmq.exception';
import { randomUUID } from 'crypto';

interface RabbitMQMessage<T> {
  content: T;
  timestamp: number;
  messageId: string;
}

@Injectable()
export class RabbitMQRepository implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQRepository.name);
  private readonly channel: Channel;
  private readonly connection: Connection;

  constructor(
    @Inject('RabbitMQConnection')
    connection: {
      channel: Channel;
      connection: Connection;
    },
  ) {
    this.channel = connection.channel;
    this.connection = connection.connection;
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.logger.log('RabbitMQ connections closed successfully');
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error('Error closing RabbitMQ connections:', error.message);
      }
    }
  }

  private validateChannel(): void {
    if (!this.channel) {
      throw new RabbitMQException('RabbitMQ channel not initialized');
    }
  }

  private createMessage<T extends Record<string, unknown>>(
    content: T,
  ): RabbitMQMessage<T> {
    return {
      content,
      timestamp: Date.now(),
      messageId: randomUUID(),
    };
  }

  async publish<T extends Record<string, unknown>>(
    exchange: string,
    routingKey: string,
    content: T,
  ): Promise<void> {
    this.validateChannel();

    const message = this.createMessage(content);
    const messageBuffer = Buffer.from(JSON.stringify(message));

    await new Promise<void>((resolve, reject) => {
      try {
        const published = this.channel.publish(
          exchange,
          routingKey,
          messageBuffer,
          {
            persistent: true,
            contentType: 'application/json',
            messageId: message.messageId,
            timestamp: message.timestamp,
          },
        );

        if (published) {
          this.logger.debug(
            `Message published to ${exchange} with routing key ${routingKey}`,
            { messageId: message.messageId },
          );
          resolve();
        } else {
          reject(new RabbitMQException('Message was not published'));
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        reject(
          new RabbitMQException(`Failed to publish message: ${errorMessage}`),
        );
      }
    });
  }

  async consume<T extends Record<string, unknown>>(
    queue: string,
    callback: (message: T) => Promise<void>,
  ): Promise<void> {
    this.validateChannel();

    try {
      await this.channel.consume(
        queue,
        (msg: Message | null) => {
          if (!msg) {
            this.logger.warn('Received null message');
            return;
          }

          void this.handleMessage<T>(msg, callback);
        },
        { noAck: false },
      );

      this.logger.log(`Started consuming messages from queue: ${queue}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new RabbitMQException(
        `Failed to consume messages: ${errorMessage}`,
      );
    }
  }

  private async handleMessage<T extends Record<string, unknown>>(
    msg: Message,
    callback: (message: T) => Promise<void>,
  ): Promise<void> {
    try {
      const content = JSON.parse(msg.content.toString()) as RabbitMQMessage<T>;
      await callback(content.content);
      this.channel.ack(msg);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error processing message: ${errorMessage}`);
      this.channel.nack(msg, false, false);
    }
  }

  async bindQueue(
    queue: string,
    exchange: string,
    routingKey: string,
  ): Promise<void> {
    this.validateChannel();

    try {
      await this.channel.bindQueue(queue, exchange, routingKey);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new RabbitMQException(`Failed to bind queue: ${errorMessage}`);
    }
  }

  async assertQueue(
    queue: string,
    options: {
      deadLetterExchange?: string;
      deadLetterRoutingKey?: string;
    } = {},
  ): Promise<void> {
    this.validateChannel();

    try {
      await this.channel.assertQueue(queue, {
        durable: true,
        arguments: {
          ...(options.deadLetterExchange && {
            'x-dead-letter-exchange': options.deadLetterExchange,
          }),
          ...(options.deadLetterRoutingKey && {
            'x-dead-letter-routing-key': options.deadLetterRoutingKey,
          }),
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new RabbitMQException(`Failed to assert queue: ${errorMessage}`);
    }
  }
}
