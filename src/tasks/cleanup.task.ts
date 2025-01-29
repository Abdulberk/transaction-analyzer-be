// src/tasks/cleanup.task.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalysisCacheService } from '../services/analysis-cache.service';

@Injectable()
export class CleanupTask {
  private readonly logger = new Logger(CleanupTask.name);

  constructor(private readonly analysisCacheService: AnalysisCacheService) {}

  @Cron(CronExpression.EVERY_HOUR, {
    name: 'cache-cleanup-task',
  })
  async handleCacheCleanup() {
    this.logger.log('Starting cache cleanup...');
    await this.analysisCacheService.cleanup();
    this.logger.log('Cache cleanup completed');
  }
}
