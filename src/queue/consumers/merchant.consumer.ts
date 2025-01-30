// src/queue/consumers/merchant.consumer.ts
import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service';
import { MerchantEventHandler } from '../../events/handlers/merchant.handler';
import type { MerchantEvent } from '../../infrastructure/rabbitmq/rabbitmq.service';

@Injectable()
export class MerchantConsumer {
  private readonly logger = new Logger(MerchantConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly merchantHandler: MerchantEventHandler,
  ) {
    this.setupConsumers();
  }

  private async setupConsumers() {
    await this.rabbitmq.setupMerchantConsumers(
    
      async (data: MerchantEvent) => {
        try {
          await this.merchantHandler.onMerchantCreated(data);
        } catch (error) {
          this.logger.error(
            `Error processing merchant created: ${error.message}`,
          );
        }
      },
    
      async (data: MerchantEvent) => {
        try {
          await this.merchantHandler.onMerchantUpdated(data);
        } catch (error) {
          this.logger.error(
            `Error processing merchant update: ${error.message}`,
          );
        }
      },
    
      async (data: Pick<MerchantEvent, 'merchantId'>) => {
        try {
          await this.merchantHandler.onMerchantDeactivated(data);
        } catch (error) {
          this.logger.error(
            `Error processing merchant deactivation: ${error.message}`,
          );
        }
      },
    );
  }
}
