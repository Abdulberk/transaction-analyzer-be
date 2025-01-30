// src/queue/consumers/pattern.consumer.ts
import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service';
import { PatternEventHandler } from '../../events/handlers/pattern.handler';
import type { PatternEvent } from '../../infrastructure/rabbitmq/rabbitmq.service';

@Injectable()
export class PatternConsumer {
  private readonly logger = new Logger(PatternConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly patternHandler: PatternEventHandler,
  ) {
    this.setupConsumers();
  }

  private async setupConsumers() {
    await this.rabbitmq.setupPatternConsumers(
      
      async (data: PatternEvent) => {
        try {
          await this.patternHandler.onPatternDetected(data);
        } catch (error) {
          this.logger.error(
            `Error processing pattern detection: ${error.message}`,
          );
        }
      },
    
      async (data: PatternEvent) => {
        try {
          await this.patternHandler.onPatternUpdated(data);
        } catch (error) {
          this.logger.error(
            `Error processing pattern update: ${error.message}`,
          );
        }
      },
    );
  }
}
