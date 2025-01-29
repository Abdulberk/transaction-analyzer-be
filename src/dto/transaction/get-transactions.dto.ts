// src/dto/transaction/get-transactions.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { 
  IsOptional, 
  IsString, 
  IsUUID, 
  IsDate, 
  IsInt, 
  Min, 
  Max,
  IsEnum 
} from 'class-validator';

export enum TransactionSortBy {
  DATE = 'date',
  AMOUNT = 'amount',
  MERCHANT = 'merchant',
  CATEGORY = 'category'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export class GetTransactionsQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (starts from 1)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by merchant ID',
  })
  @IsOptional()
  @IsUUID()
  merchantId?: string;

  @ApiPropertyOptional({
    description: 'Start date for filtering transactions',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'End date for filtering transactions',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter by category',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Search in transaction description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: TransactionSortBy,
    default: TransactionSortBy.DATE,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsEnum(TransactionSortBy)
  sortBy?: TransactionSortBy = TransactionSortBy.DATE;

  @ApiPropertyOptional({
    enum: SortOrder,
    default: SortOrder.DESC,
    description: 'Sort order',
  })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;
}