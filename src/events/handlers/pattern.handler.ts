// src/events/handlers/pattern.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { PatternService } from '../../services/pattern.service';
import { PatternEvent } from '../../infrastructure/rabbitmq/rabbitmq.service';

@Injectable()
export class PatternEventHandler {
  private readonly logger = new Logger(PatternEventHandler.name);

  constructor(private readonly patternService: PatternService) {}

  async onPatternDetected(data: PatternEvent): Promise<void> {
    try {
      this.logger.debug(
        `Pattern detected for merchant ${data.merchantId}: ${data.type}`,
      );
    } catch (error) {
      this.logger.error(`Failed to handle pattern detection: ${error.message}`);
      throw error;
    }
  }

  async onPatternUpdated(data: PatternEvent): Promise<void> {
    try {
      this.logger.debug(
        `Pattern updated for merchant ${data.merchantId}: ${data.type}`,
      );
    } catch (error) {
      this.logger.error(`Failed to handle pattern update: ${error.message}`);
      throw error;
    }
  }
}
