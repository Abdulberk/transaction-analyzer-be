// src/dto/transaction/analyze-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { NormalizedMerchantDto } from '../merchant';
import { DetectedPatternDto } from '../pattern/detect-pattern.dto';

export class NormalizedTransactionDto {
  @ApiProperty({ example: 'NFLX DIGITAL NTFLX US' })
  original: string;

  @ApiProperty({ type: NormalizedMerchantDto })
  normalized: NormalizedMerchantDto;
}

export class CombinedAnalysisResponseDto {
  @ApiProperty({ type: [NormalizedTransactionDto] })
  normalized_transactions: NormalizedTransactionDto[];

  @ApiProperty({ type: [DetectedPatternDto] })
  detected_patterns: DetectedPatternDto[];

  @ApiProperty()
  processedCount?: number;

  @ApiProperty()
  failedCount?: number;

  @ApiProperty({ type: [String] })
  errors?: string[];
}
