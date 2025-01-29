// src/dtos/merchant/create-merchant.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  Min,
  Max,
  IsArray,
  IsOptional,
} from 'class-validator';

export class CreateMerchantDto {
  @ApiProperty({ example: 'AMZN MKTP US*Z1234ABC' })
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @ApiProperty({ example: 'Amazon' })
  @IsString()
  @IsNotEmpty()
  normalizedName: string;

  @ApiProperty({ example: 'Shopping' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'Online Retail', required: false })
  @IsString()
  subCategory?: string;

  @ApiProperty({ example: 0.95, minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({
    example: ['Digital', 'Recurring', 'Subscription'],
    required: false,
    isArray: true,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  flags?: string[];
}
