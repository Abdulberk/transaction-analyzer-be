// src/queue/publishers/merchant.publisher.ts
import { Injectable } from '@nestjs/common';
import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service';
import type { MerchantEvent } from '../../infrastructure/rabbitmq/rabbitmq.service';

@Injectable()
export class MerchantPublisher {
  constructor(private readonly rabbitmq: RabbitMQService) {}

  async publishMerchantCreated(
    data: Omit<MerchantEvent, 'timestamp'>,
  ): Promise<void> {
    await this.rabbitmq.publishMerchantCreated(data);
  }

  async publishMerchantUpdated(
    data: Omit<MerchantEvent, 'timestamp'>,
  ): Promise<void> {
    await this.rabbitmq.publishMerchantUpdated(data);
  }

  async publishMerchantDeactivated(
    data: Pick<MerchantEvent, 'merchantId' | 'normalizedName'>,
  ): Promise<void> {
    await this.rabbitmq.publishMerchantDeactivated(data);
  }
}
