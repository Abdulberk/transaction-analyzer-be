import { Prisma } from '@prisma/client';

// src/types/transaction.types.ts
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: Date;
  merchantId?: string;
  category?: string;
  subCategory?: string;
  confidence?: number;
  isSubscription: boolean;
  flags: string[];
  isAnalyzed: boolean;
  analyzedAt?: Date;
}

export interface AnalysisResult {
  merchant: string;
  category: string;
  subCategory?: string;
  confidence: number;
  isSubscription: boolean;
  flags: string[];
}

export interface CreateTransactionDto {
  description: string;
  amount: number;
  date: Date;
}

export interface TransactionAnalysis extends Record<string, unknown> {
  merchant?: Prisma.MerchantUpdateOneWithoutTransactionsNestedInput;
  category: string;
  subCategory?: string;
  confidence: number;
  isSubscription: boolean;
  flags: string[];
}

export interface AnalyzedTransaction {
  id: string;
  description: string;
  amount: number;
  date: Date;
  analysis: TransactionAnalysis;
}

export type TransactionCreateInput = Prisma.TransactionCreateInput;
export type TransactionUpdateInput = Prisma.TransactionUpdateInput;
