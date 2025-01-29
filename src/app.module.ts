// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MerchantModule } from './modules/merchant.module';
import { TransactionModule } from './modules/transaction.module';
import { PatternModule } from './modules/pattern.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { MerchantRuleModule } from './modules/merchant-rule.module';
import { AnalysisModule } from './modules/analysis.module';
import { EventModule } from './events/event.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    MerchantModule,
    TransactionModule,
    PatternModule,
    InfrastructureModule,
    MerchantRuleModule,
    AnalysisModule,
    EventModule,
  ],
})
export class AppModule {}
