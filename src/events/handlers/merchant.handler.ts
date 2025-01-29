// src/events/handlers/merchant.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { MerchantService } from '../../services/merchant.service';
import { MerchantEvent } from '../../infrastructure/rabbitmq/rabbitmq.service';

@Injectable()
export class MerchantEventHandler {
  private readonly logger = new Logger(MerchantEventHandler.name);

  constructor(private readonly merchantService: MerchantService) {}

  async onMerchantCreated(data: MerchantEvent): Promise<void> {
    try {
      this.logger.debug(`Merchant created: ${data.merchantId}`);
    } catch (error) {
      this.logger.error(`Failed to handle merchant creation: ${error.message}`);
      throw error;
    }
  }

  async onMerchantUpdated(data: MerchantEvent): Promise<void> {
    try {
      this.logger.debug(`Merchant updated: ${data.merchantId}`);
    } catch (error) {
      this.logger.error(`Failed to handle merchant update: ${error.message}`);
      throw error;
    }
  }

  async onMerchantDeactivated(
    data: Pick<MerchantEvent, 'merchantId'>,
  ): Promise<void> {
    try {
      this.logger.debug(`Merchant deactivated: ${data.merchantId}`);
    } catch (error) {
      this.logger.error(
        `Failed to handle merchant deactivation: ${error.message}`,
      );
      throw error;
    }
  }
}
