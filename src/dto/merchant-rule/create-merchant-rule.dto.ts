// src/dtos/merchant-rule/create-merchant-rule.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateMerchantRuleDto {
  @ApiProperty()
  @IsString()
  pattern: string;

  @ApiProperty()
  @IsString()
  normalizedName: string;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  subCategory?: string;

  @ApiProperty({ minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  priority: number;
}
