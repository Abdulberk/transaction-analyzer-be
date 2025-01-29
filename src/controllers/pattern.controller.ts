// src/controllers/pattern.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpStatus,
  HttpException,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PatternService } from '../services/pattern.service';
import {
  PatternAnalysisRequestDto,
  PatternAnalysisResponseDto,
} from 'src/dto/pattern/detect-pattern.dto';
import { PatternResponseDto } from 'src/dto/pattern/pattern-response.dto';

@ApiTags('Patterns')
@Controller('api/patterns')
export class PatternController {
  constructor(private readonly patternService: PatternService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze transactions for patterns' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PatternAnalysisResponseDto,
  })
  async analyzePatterns(
    @Body(new ValidationPipe({ transform: true }))
    dto: PatternAnalysisRequestDto,
  ): Promise<PatternAnalysisResponseDto> {
    try {
      return await this.patternService.analyzeTransactionPatterns(dto);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new HttpException(
        `Failed to analyze patterns: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('merchant/:merchantId')
  @ApiOperation({ summary: 'Get patterns by merchant ID' })
  @ApiParam({
    name: 'merchantId',
    type: String,
    description: 'Merchant ID',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PatternResponseDto,
    isArray: true,
    description: 'Returns patterns associated with the merchant.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No patterns found for the merchant.',
  })
  async getPatternsByMerchant(
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
  ): Promise<PatternResponseDto[]> {
    try {
      const patterns =
        await this.patternService.getPatternsByMerchant(merchantId);
      if (!patterns.length) {
        throw new HttpException(
          'No patterns found for this merchant',
          HttpStatus.NOT_FOUND,
        );
      }
      return patterns;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new HttpException(
        `Failed to get merchant patterns: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
