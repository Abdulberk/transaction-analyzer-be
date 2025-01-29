// src/dtos/merchant/merchant-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class MerchantResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  originalName: string;

  @ApiProperty()
  normalizedName: string;

  @ApiProperty()
  category: string;

  @ApiProperty({ required: false })
  subCategory?: string;

  @ApiProperty()
  confidence: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: [String] })
  flags: string[];

  @ApiProperty()
  transactionCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
