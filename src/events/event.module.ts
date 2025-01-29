// src/events/event.module.ts
import { Module } from '@nestjs/common';
import { TransactionEventHandler } from './handlers/transaction.handler';
import { MerchantEventHandler } from './handlers/merchant.handler';
import { PatternEventHandler } from './handlers/pattern.handler';
import { TransactionModule } from '../modules/transaction.module';
import { MerchantModule } from '../modules/merchant.module';
import { PatternModule } from '../modules/pattern.module';
import { RabbitMQModule } from 'src/infrastructure/rabbitmq/rabbitmq.module';

@Module({
  imports: [TransactionModule, MerchantModule, PatternModule, RabbitMQModule],
  providers: [
    TransactionEventHandler,
    MerchantEventHandler,
    PatternEventHandler,
  ],
  exports: [TransactionEventHandler, MerchantEventHandler, PatternEventHandler],
})
export class EventModule {}
