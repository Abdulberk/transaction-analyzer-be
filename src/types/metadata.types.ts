// src/types/metadata.types.ts
export interface MerchantMetadata {
  aiAnalysis: {
    normalizedName: string;
    category: string;
    subCategory?: string;
    confidence: number;
    flags: string[];
  };
  createdAt: string;
}

export interface PatternMetadata {
  lastUpdate?: string;
  transactionCount: number;
  averageAmount: number;
  createdAt?: string;
}
