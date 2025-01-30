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

export class SavedResourcesDto {
  @ApiProperty({
    type: [SavedResourceDto],
    description: 'Normalized merchants created during processing',
  })
  merchants: SavedResourceDto[];

  @ApiProperty({
    type: [SavedTransactionDto],
    description: 'Processed and saved transactions',
  })
  transactions: SavedTransactionDto[];

  @ApiProperty({
    type: [SavedPatternDto],
    description: 'Detected and saved patterns',
  })
  patterns: SavedPatternDto[];
}

export class UploadTransactionResponseDto {
  @ApiProperty({
    type: [NormalizedTransactionDto],
    description: 'AI-normalized transaction details',
  })
  normalized_transactions: NormalizedTransactionDto[];

  @ApiProperty({
    type: [DetectedPatternDto],
    description: 'Patterns detected in the transactions',
  })
  detected_patterns: DetectedPatternDto[];

  @ApiProperty({
    example: 26,
    description: 'Total number of processed transactions',
  })
  processedCount: number;

  @ApiProperty({
    example: 0,
    description: 'Number of transactions that failed processing',
  })
  failedCount: number;

  @ApiProperty({
    type: [String],
    example: [],
    description: 'Error messages if any occurred during processing',
  })
  errors?: string[];

  @ApiProperty({
    type: SavedResourcesDto,
    description: 'Details of all resources saved to database',
  })
  savedResources: SavedResourcesDto;
}
