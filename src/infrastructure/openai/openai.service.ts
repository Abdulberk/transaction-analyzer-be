// src/infrastructure/openai/openai.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { MerchantAnalysisDto } from 'src/dto/merchant';
import type { PatternAnalysisResponseDto } from 'src/dto/pattern/detect-pattern.dto';

@Injectable()
export class OpenAIService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(OpenAIService.name);
  private readonly MODEL = 'gpt-4o';
  private readonly TEMPERATURE = 0.2;
  private readonly MAX_TOKENS = 500;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  async analyzeMerchant(description: string): Promise<MerchantAnalysisDto> {
    const prompt = this.buildMerchantAnalysisPrompt(description);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a financial transaction analyzer specialized in merchant normalization and categorization.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: this.TEMPERATURE,
        max_tokens: this.MAX_TOKENS,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      if (!result.merchant || !result.category) {
        throw new Error('Invalid response format from OpenAI');
      }

      return {
        normalizedName: result.merchant,
        category: result.category,
        subCategory: result.sub_category || undefined,
        confidence: result.confidence || 0.8,
        flags: Array.isArray(result.flags) ? result.flags : []
      };
    } catch (error) {
      this.logger.error('Merchant analysis failed:', {
        error,
        description,
        errorMessage: error.message
      });
      throw new Error(`Merchant analysis failed: ${error.message}`);
    }
  }

  async analyzePattern(
    transactions: Array<{ 
      description: string; 
      amount: number; 
      date: string | Date 
    }>
  ): Promise<{
    type: string;
    description: string;
    confidence: number;
  }> {
    const prompt = this.buildPatternAnalysisPrompt(transactions);

    try {
      const response = await this.openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a financial pattern analyzer specialized in detecting transaction patterns.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: this.TEMPERATURE,
        max_tokens: this.MAX_TOKENS,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');

      if (!result.type || !result.description || typeof result.confidence !== 'number') {
        throw new Error('Invalid pattern analysis response format');
      }

      return {
        type: result.type.toUpperCase(),
        description: result.description,
        confidence: result.confidence
      };
    } catch (error) {
      this.logger.error('Pattern analysis failed:', {
        error,
        transactionCount: transactions.length,
        errorMessage: error.message
      });
      throw new Error(`Pattern analysis failed: ${error.message}`);
    }
  }

  async analyzeTransactionPatterns(
    transactions: Array<{
      description: string;
      amount: number;
      date: string | Date;
    }>
  ): Promise<PatternAnalysisResponseDto> {
    const prompt = this.buildTransactionPatternsPrompt(transactions);

    try {
      const response = await this.openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a financial pattern analyzer specialized in detecting transaction patterns across multiple transactions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: this.TEMPERATURE,
        max_tokens: this.MAX_TOKENS,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');

      if (!Array.isArray(result.patterns)) {
        throw new Error('Invalid transaction patterns response format');
      }

      return { patterns: result.patterns };
    } catch (error) {
      this.logger.error('Transaction patterns analysis failed:', {
        error,
        transactionCount: transactions.length,
        errorMessage: error.message
      });
      throw new Error(`Transaction patterns analysis failed: ${error.message}`);
    }
  }

  private buildMerchantAnalysisPrompt(description: string): string {
    return `Analyze this merchant description and provide normalized details:
Description: "${description}"

Rules:
1. Name: Remove common prefixes/suffixes (e.g., AMZN MKTP -> Amazon)
2. Category: Use standard categories (Shopping, Entertainment, Food & Dining, etc.)
3. SubCategory: Use specific values (Online Retail, Streaming Service, etc.)
4. Flags: Add relevant flags (digital_service, subscription, marketplace, etc.)

Respond in JSON format:
{
  "merchant": "normalized name",
  "category": "main category",
  "sub_category": "specific subcategory",
  "confidence": 0-1,
  "flags": ["flag1", "flag2"]
}`;
  }

  private buildPatternAnalysisPrompt(
    transactions: Array<{
      description: string;
      amount: number;
      date: string | Date;
    }>
  ): string {
    return `Analyze these transactions and determine if they form a pattern:

Transactions:
${transactions.map(t => 
  `- ${t.description}: $${t.amount} on ${t.date}`
).join('\n')}

Determine:
1. If this is a SUBSCRIPTION (fixed amount) or RECURRING (variable amount) pattern
2. Confidence score based on consistency
3. Detailed explanation of the pattern

Respond in JSON format:
{
  "type": "SUBSCRIPTION|RECURRING",
  "confidence": 0-1,
  "description": "detailed explanation"
}`;
  }

  private buildTransactionPatternsPrompt(
    transactions: Array<{
      description: string;
      amount: number;
      date: string | Date;
    }>
  ): string {
    return `Analyze these transactions and identify all recurring patterns:

Transactions:
${transactions.map(t => 
  `- ${t.description}: $${t.amount} on ${t.date}`
).join('\n')}

For each pattern identify:
1. Type (subscription vs recurring)
2. Merchant name
3. Average/fixed amount
4. Frequency (weekly, monthly)
5. Confidence score
6. Next expected date
7. Pattern description

Respond in JSON format:
{
  "patterns": [{
    "type": "subscription|recurring",
    "merchant": "merchant name",
    "amount": number,
    "frequency": "weekly|monthly",
    "confidence": 0-1,
    "next_expected": "YYYY-MM-DD",
    "description": "detailed explanation"
  }]
}`;
  }


}