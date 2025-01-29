// src/dto/merchant/normalize-merchant.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class NormalizeMerchantDto {
  @ApiProperty({ example: 'AMZN MKTP US*Z1234ABC' })
  @IsString()
  @IsNotEmpty()
  description: string;
}

export class TransactionForNormalizationDto {
  @ApiProperty({ example: 'AMZN MKTP US*Z1234ABC' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: -89.97 })
  amount: number;

  @ApiProperty({ example: '2024-01-15' })
  date: string;
}

export class NormalizeMerchantRequestDto {
  @ApiProperty({ type: TransactionForNormalizationDto })
  transaction: TransactionForNormalizationDto;
}

export class MerchantAnalysisDto {
  normalizedName: string;
  category: string;
  subCategory?: string;
  confidence: number;
  flags: string[];
}

export class NormalizedMerchantDto {
  @ApiProperty({ example: 'Amazon' })
  merchant: string;

  @ApiProperty({ example: 'Shopping' })
  category: string;

  @ApiProperty({ example: 'Online Retail' })
  sub_category: string;

  @ApiProperty({ example: 0.95 })
  confidence: number;

  @ApiProperty({ example: false })
  is_subscription: boolean;

  @ApiProperty({ example: ['online_purchase', 'marketplace'] })
  flags: string[];
}

export class NormalizeMerchantResponseDto {
  @ApiProperty({ type: NormalizedMerchantDto })
  normalized: NormalizedMerchantDto;
}
