// src/dto/pattern/detect-pattern.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ValidateNested,
  IsString,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TransactionForPatternDto {
  @IsString()
  description: string;

  @IsNumber()
  amount: number;

  @ApiProperty({ example: '2024-01-01' })
  date: string | Date;
}

export class DetectPatternDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionForPatternDto)
  transactions: TransactionForPatternDto[];
}


export class PatternAnalysisRequestDto {
  @ApiProperty({
    type: [TransactionForPatternDto],
    example: [
      {
        description: 'NETFLIX',
        amount: -19.99,
        date: '2024-01-01',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionForPatternDto)
  transactions: TransactionForPatternDto[];
}

export class DetectedPatternDto {
  @ApiProperty({ example: 'subscription' })
  type: string;

  @ApiProperty({ example: 'Netflix' })
  merchant: string;

  @ApiProperty({ example: 19.99 })
  amount: number;

  @ApiProperty({ example: 'monthly' })
  frequency: string;

  @ApiProperty({ example: 0.98 })
  confidence: number;

  @ApiProperty({ example: '2024-02-01' })
  next_expected: string;

  @ApiProperty({ 
    example: 'Monthly subscription with consistent amount of $19.99',
    description: 'Detailed description of the detected pattern',
    required: false 
  })
  description?: string;

  
  @ApiProperty({ example: 'Regular monthly subscription', required: false })
  notes?: string;
}

export class PatternAnalysisResponseDto {
  @ApiProperty({ type: [DetectedPatternDto] })
  patterns: DetectedPatternDto[];
}
