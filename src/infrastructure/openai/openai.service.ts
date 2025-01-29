// src/infrastructure/openai/openai.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(OpenAIService.name);

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  async analyze(prompt: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a financial transaction analysis assistant. Provide concise, structured responses.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No response from OpenAI');
      }

      return result.trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`OpenAI analysis failed: ${message}`);
      throw new Error(`AI analysis failed: ${message}`);
    }
  }

  async analyzeMerchant(description: string): Promise<{
    normalizedName: string;
    category: string;
    subCategory?: string;
    confidence: number;
    flags: string[];
  }> {
    const prompt = `As a financial transaction analyzer, normalize this merchant description:
Description: "${description}"

Rules:
1. Name: Remove common prefixes/suffixes (e.g., AMZN MKTP -> Amazon)
2. Category: Use standard categories (e.g., Shopping, Entertainment, Food & Dining)
3. SubCategory: Use specific values like:
   - Online Retail (for Amazon, eBay)
   - Streaming Service (for Netflix, Spotify)
   - Ride Sharing (for Uber, Lyft)
   - Food Delivery (for DoorDash, UberEats)
4. Flags: Add relevant flags like:
   - digital_service (for online services)
   - subscription (for recurring subscriptions)
   - marketplace (for shopping platforms)
   - online_purchase (for e-commerce)

Respond in exactly this format:
Name: [normalized name]
Category: [main category]
SubCategory: [specific subcategory]
Flags: [flag1, flag2]`;

    try {
      const response = await this.analyze(prompt);
      this.logger.debug('OpenAI response:', response);

      const lines = response.split('\n');

      const normalizedName =
        lines
          .find((l) => l.startsWith('Name:'))
          ?.split(':')[1]
          ?.trim() || '';
      const category =
        lines
          .find((l) => l.startsWith('Category:'))
          ?.split(':')[1]
          ?.trim() || '';
      const subCategory = lines
        .find((l) => l.startsWith('SubCategory:'))
        ?.split(':')[1]
        ?.trim();

      const flagsLine =
        lines
          .find((l) => l.startsWith('Flags:'))
          ?.split(':')[1]
          ?.trim() || '';
      const flags = flagsLine
        .split(',')
        .map((flag) => flag.trim())
        .filter((flag) => flag.length > 0)
        .map((flag) => flag.replace(/[\[\]]/g, ''))
        .map((flag) => flag.toLowerCase().replace(' ', '_'));

      return {
        normalizedName,
        category,
        subCategory,
        confidence: this.calculateConfidence({
          hasName: Boolean(normalizedName),
          hasCategory: Boolean(category),
          hasSubCategory: Boolean(subCategory),
          hasFlags: flags.length > 0,
        }),
        flags,
      };
    } catch (error) {
      this.logger.error('Merchant analysis failed:', error);
      throw new Error(`Merchant analysis failed: ${error.message}`);
    }
  }

  async analyzePattern(
    transactions: Array<{ description: string; amount: number; date: string }>,
  ): Promise<{
    type: string;
    description: string;
    confidence: number;
  }> {
    const prompt = `Analyze these transactions for patterns:
${JSON.stringify(transactions, null, 2)}

Detect:
1. Subscription patterns (fixed amount, regular interval)
2. Recurring patterns (variable amount, regular pattern)
3. Future transaction predictions

Response Format:
{
  "type": "subscription|recurring",
  "frequency": "daily|weekly|monthly",
  "amount": number,
  "next_expected": "YYYY-MM-DD",
  "confidence": number
}`;

    try {
      const response = await this.analyze(prompt);
      const lines = response.split('\n');

      const type =
        lines
          .find((l) => l.startsWith('Type:'))
          ?.split(':')[1]
          ?.trim() || '';
      const description =
        lines
          .find((l) => l.startsWith('Description:'))
          ?.split(':')[1]
          ?.trim() || '';
      const confidenceStr =
        lines
          .find((l) => l.startsWith('Confidence:'))
          ?.split(':')[1]
          ?.trim() || '0';

      return {
        type,
        description,
        confidence: parseFloat(confidenceStr),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Pattern analysis failed: ${message}`);
      throw new Error(`Pattern analysis failed: ${message}`);
    }
  }

  private calculateConfidence(params: {
    hasName: boolean;
    hasCategory: boolean;
    hasSubCategory: boolean;
    hasFlags: boolean;
  }): number {
    let confidence = 0.5;

    if (params.hasName) confidence += 0.2;
    if (params.hasCategory) confidence += 0.2;
    if (params.hasSubCategory) confidence += 0.05;
    if (params.hasFlags) confidence += 0.05;

    return Number(confidence.toFixed(2));
  }
}
