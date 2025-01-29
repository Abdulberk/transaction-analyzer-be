// src/modules/analysis.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AnalysisCacheService } from '../services/analysis-cache.service';
import { CleanupTask } from '../tasks/cleanup.task';
import { PrismaService } from '../services/base/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [AnalysisCacheService, CleanupTask, PrismaService],
  exports: [AnalysisCacheService],
})
export class AnalysisModule {}
