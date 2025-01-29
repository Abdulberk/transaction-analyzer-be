// src/dto/transaction/upload-transaction.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { NormalizedTransactionDto } from './analyze-response.dto';
import { DetectedPatternDto } from '../pattern/detect-pattern.dto';

class SavedResourceDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  normalizedName: string;
}

class SavedTransactionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  description: string;
}

class SavedPatternDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  merchant: string;
}

class SavedResourcesDto {
  @ApiProperty({ type: [SavedResourceDto] })
  merchants: SavedResourceDto[];

  @ApiProperty({ type: [SavedTransactionDto] })
  transactions: SavedTransactionDto[];

  @ApiProperty({ type: [SavedPatternDto] })
  patterns: SavedPatternDto[];
}

export class UploadTransactionResponseDto {
  @ApiProperty({ type: [NormalizedTransactionDto] })
  normalized_transactions: NormalizedTransactionDto[];

  @ApiProperty({ type: [DetectedPatternDto] })
  detected_patterns: DetectedPatternDto[];

  @ApiProperty()
  processedCount: number;

  @ApiProperty()
  failedCount: number;

  @ApiProperty({ type: [String] })
  errors?: string[];

  @ApiProperty({ type: SavedResourcesDto })
  savedResources: SavedResourcesDto;
}
