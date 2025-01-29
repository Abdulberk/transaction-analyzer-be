// src/dtos/pattern/pattern-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { PatternType, Frequency } from '@prisma/client';

export class PatternResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: PatternType })
  type: PatternType;

  @ApiProperty()
  merchantId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty({ enum: Frequency })
  frequency: Frequency;

  @ApiProperty()
  confidence: number;

  @ApiProperty({ required: false })
  nextExpectedDate?: Date;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
