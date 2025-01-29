// src/dtos/transaction/transaction-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class MerchantDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  category: string;
}

export class TransactionAnalysisDto {
  @ApiProperty({ type: MerchantDto, required: false })
  merchant?: MerchantDto;

  @ApiProperty()
  category: string;

  @ApiProperty({ required: false })
  subCategory?: string;

  @ApiProperty()
  confidence: number;

  @ApiProperty()
  isSubscription: boolean;

  @ApiProperty({ type: [String] })
  flags: string[];
}

export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  date: Date;

  @ApiProperty({ type: TransactionAnalysisDto })
  analysis: TransactionAnalysisDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}


export class TransactionListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  merchant: {
    id: string;
    name: string;
    category: string;
  };

  @ApiProperty()
  category: string;

  @ApiProperty({ required: false })
  subCategory?: string;

  @ApiProperty()
  isSubscription: boolean;

  @ApiProperty({ type: [String] })
  flags: string[];
}

export class TransactionListResponseDto {
  @ApiProperty({ type: [TransactionListItemDto] })
  items: TransactionListItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}