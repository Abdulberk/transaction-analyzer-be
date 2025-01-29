// src/controllers/transaction.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  HttpStatus,
  HttpException,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { TransactionService } from '../services/transaction.service';
import {
  CombinedAnalysisResponseDto,
  CreateTransactionDto,
  TransactionListResponseDto,
  TransactionResponseDto,
  UploadTransactionResponseDto,
} from 'src/dto/transaction';
import { GetTransactionsQueryDto } from 'src/dto/transaction/get-transactions.dto';

@ApiTags('Transactions')
@Controller('api/transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: TransactionResponseDto,
  })
  async createTransaction(
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    try {
      return await this.transactionService.createTransaction(dto);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new HttpException(
        `Failed to create transaction: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get analyzed transaction' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TransactionResponseDto,
  })
  async getAnalyzedTransaction(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransactionResponseDto> {
    const transaction =
      await this.transactionService.getAnalyzedTransaction(id);

    if (!transaction) {
      throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
    }

    return transaction;
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload and analyze transactions from CSV' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: UploadTransactionResponseDto,
  })
  async uploadTransactions(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadTransactionResponseDto> {
    try {
      const analysis =
        await this.transactionService.processTransactionFile(file);
      return {
        ...analysis,
        processedCount: analysis.normalized_transactions.length,
        failedCount: 0,
        errors: [],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new HttpException(
        `Failed to process file: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('analyze')
  @ApiOperation({
    summary: 'Analyze transactions for patterns and normalize merchants',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: CombinedAnalysisResponseDto,
  })
  async analyzeTransactions(
    @Body(new ValidationPipe({ transform: true }))
    dto: {
      transactions: CreateTransactionDto[];
    },
  ): Promise<CombinedAnalysisResponseDto> {
    try {
      return await this.transactionService.analyzeTransactions(dto);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new HttpException(
        `Failed to analyze transactions: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get transactions list' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of transactions',
    type: TransactionListResponseDto,
  })
  @ApiQuery({ type: GetTransactionsQueryDto })
  async getTransactions(
    @Query() query: GetTransactionsQueryDto,
  ): Promise<TransactionListResponseDto> {
    return await this.transactionService.getTransactions(query);
  }
}
