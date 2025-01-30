// src/dtos/pattern/pattern-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { PatternType, Frequency } from '@prisma/client';

export class PatternResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ 
    enum: PatternType,
    example: 'SUBSCRIPTION',
    description: 'Type of detected pattern'
  })
  type: PatternType;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  merchantId: string;

  @ApiProperty({ example: 19.99 })
  amount: number;

  @ApiProperty({ 
    enum: Frequency,
    example: 'MONTHLY',
    description: 'Detected frequency of the pattern'
  })
  frequency: Frequency;

  @ApiProperty({ 
    example: 0.95,
    description: 'AI confidence score in pattern detection'
  })
  confidence: number;

  @ApiProperty({ 
    example: '2024-02-01T00:00:00.000Z',
    required: false,
    description: 'Predicted next occurrence date'
  })
  nextExpectedDate?: Date;

  @ApiProperty({ 
    example: 'Monthly subscription with consistent amount of $19.99',
    required: false,
    description: 'AI-generated pattern description'
  })
  description?: string;

  @ApiProperty({ example: '2024-01-30T18:51:30.586Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-30T18:51:30.586Z' })
  updatedAt: Date;
}