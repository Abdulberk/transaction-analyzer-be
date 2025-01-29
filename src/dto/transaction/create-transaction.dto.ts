// src/dto/transaction/create-transaction.dto.ts
import { IsString, IsNumber, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({
    example: 'NETFLIX DIGITAL NTFLX US',
    description: 'Transaction description',
  })
  @IsString()
  description: string;

  @ApiProperty({
    example: -19.99,
    description: 'Transaction amount',
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    example: '2024-01-15T00:00:00.000Z',
    description: 'Transaction date in ISO-8601 format',
  })
  @IsISO8601()
  date: Date;
}
