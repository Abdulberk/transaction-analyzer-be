// src/services/analysis-cache.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './base/prisma.service';

@Injectable()
export class AnalysisCacheService {
  private readonly logger = new Logger(AnalysisCacheService.name);

  constructor(private readonly prisma: PrismaService) {}

  async set(key: string, result: any, ttlMinutes: number = 60) {
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

      await this.prisma.analysisCache.upsert({
        where: { key },
        update: {
          result,
          expiresAt,
        },
        create: {
          key,
          result,
          expiresAt,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to cache analysis result: ${error.message}`);
    }
  }

  async get(key: string) {
    try {
      const cached = await this.prisma.analysisCache.findUnique({
        where: { key },
      });

      if (!cached || cached.expiresAt < new Date()) {
        if (cached) {
        
          await this.prisma.analysisCache.delete({ where: { key } });
        }
        return null;
      }

      return cached.result;
    } catch (error) {
      this.logger.error(`Failed to get cached analysis: ${error.message}`);
      return null;
    }
  }

  async cleanup() {
    try {
      await this.prisma.analysisCache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to cleanup expired cache: ${error.message}`);
    }
  }
}
