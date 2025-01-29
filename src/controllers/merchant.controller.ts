// src/controllers/merchant.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MerchantService } from '../services/merchant.service';
import {
  CreateMerchantDto,
  MerchantResponseDto,
  NormalizeMerchantRequestDto,
  NormalizeMerchantResponseDto,
} from 'src/dto/merchant';
import {
  SearchMerchantsDto,
  SearchMerchantsResponseDto,
} from 'src/dto/merchant/search-merchant.dto';

@ApiTags('Merchants')
@Controller('api/merchants')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new merchant' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: MerchantResponseDto,
    description: 'The merchant has been successfully created.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Merchant already exists.',
  })
  async createMerchant(
    @Body(new ValidationPipe({ transform: true }))
    dto: CreateMerchantDto,
  ): Promise<MerchantResponseDto> {
    try {
      return await this.merchantService.createMerchant(dto);
    } catch (err) {
      if (err instanceof Error && err.message === 'Merchant already exists') {
        throw new HttpException('Merchant already exists', HttpStatus.CONFLICT);
      }

      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new HttpException(
        `Failed to create merchant: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get merchant by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Merchant ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: MerchantResponseDto,
    description: 'Returns the merchant information.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Merchant not found.',
  })
  async getMerchant(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MerchantResponseDto> {
    const merchant = await this.merchantService.getMerchant(id);

    if (!merchant) {
      throw new HttpException('Merchant not found', HttpStatus.NOT_FOUND);
    }

    return merchant;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update merchant' })
  @ApiParam({ name: 'id', type: String, description: 'Merchant ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: MerchantResponseDto,
    description: 'The merchant has been successfully updated.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Merchant not found.',
  })
  async updateMerchant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true }))
    dto: Partial<CreateMerchantDto>,
  ): Promise<MerchantResponseDto> {
    try {
      return await this.merchantService.updateMerchant(id, dto);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes('Record to update not found')
      ) {
        throw new HttpException('Merchant not found', HttpStatus.NOT_FOUND);
      }

      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new HttpException(
        `Failed to update merchant: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate merchant' })
  @ApiParam({ name: 'id', type: String, description: 'Merchant ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The merchant has been successfully deactivated.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Merchant not found.',
  })
  async deactivateMerchant(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    try {
      await this.merchantService.deactivateMerchant(id);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes('Record to update not found')
      ) {
        throw new HttpException('Merchant not found', HttpStatus.NOT_FOUND);
      }

      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new HttpException(
        `Failed to deactivate merchant: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Search merchants' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SearchMerchantsResponseDto,
    description: 'Returns the paginated list of merchants.',
  })
  async searchMerchants(
    @Query(new ValidationPipe({ transform: true }))
    params: SearchMerchantsDto,
  ): Promise<SearchMerchantsResponseDto> {
    try {
      return await this.merchantService.searchMerchants(params);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new HttpException(
        `Failed to search merchants: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('normalize')
  @ApiOperation({ summary: 'Normalize merchant description' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: NormalizeMerchantResponseDto,
  })
  async normalizeMerchant(
    @Body(new ValidationPipe({ transform: true }))
    dto: NormalizeMerchantRequestDto,
  ): Promise<NormalizeMerchantResponseDto> {
    try {
      return await this.merchantService.normalizeTransaction(dto);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new HttpException(
        `Failed to normalize merchant: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
