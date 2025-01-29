-- CreateEnum
CREATE TYPE "PatternType" AS ENUM ('SUBSCRIPTION', 'RECURRING', 'REGULAR');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "merchantId" TEXT,
    "category" TEXT,
    "subCategory" TEXT,
    "confidence" DOUBLE PRECISION,
    "isSubscription" BOOLEAN NOT NULL DEFAULT false,
    "flags" TEXT[],
    "isAnalyzed" BOOLEAN NOT NULL DEFAULT false,
    "analyzedAt" TIMESTAMP(3),
    "rawData" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "flags" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pattern" (
    "id" TEXT NOT NULL,
    "type" "PatternType" NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "amount" DECIMAL(10,2),
    "confidence" DOUBLE PRECISION NOT NULL,
    "merchantId" TEXT NOT NULL,
    "nextExpectedDate" TIMESTAMP(3),
    "lastOccurrence" TIMESTAMP(3),
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantRule" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisCache" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PatternToTransaction" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PatternToTransaction_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Transaction_merchantId_idx" ON "Transaction"("merchantId");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "Transaction_category_idx" ON "Transaction"("category");

-- CreateIndex
CREATE INDEX "Transaction_isAnalyzed_idx" ON "Transaction"("isAnalyzed");

-- CreateIndex
CREATE INDEX "Merchant_originalName_idx" ON "Merchant"("originalName");

-- CreateIndex
CREATE INDEX "Merchant_category_idx" ON "Merchant"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_normalizedName_key" ON "Merchant"("normalizedName");

-- CreateIndex
CREATE INDEX "Pattern_merchantId_idx" ON "Pattern"("merchantId");

-- CreateIndex
CREATE INDEX "Pattern_type_idx" ON "Pattern"("type");

-- CreateIndex
CREATE INDEX "Pattern_nextExpectedDate_idx" ON "Pattern"("nextExpectedDate");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantRule_pattern_key" ON "MerchantRule"("pattern");

-- CreateIndex
CREATE INDEX "MerchantRule_pattern_idx" ON "MerchantRule"("pattern");

-- CreateIndex
CREATE INDEX "MerchantRule_priority_idx" ON "MerchantRule"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisCache_key_key" ON "AnalysisCache"("key");

-- CreateIndex
CREATE INDEX "AnalysisCache_key_idx" ON "AnalysisCache"("key");

-- CreateIndex
CREATE INDEX "AnalysisCache_expiresAt_idx" ON "AnalysisCache"("expiresAt");

-- CreateIndex
CREATE INDEX "_PatternToTransaction_B_index" ON "_PatternToTransaction"("B");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pattern" ADD CONSTRAINT "Pattern_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantRule" ADD CONSTRAINT "MerchantRule_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PatternToTransaction" ADD CONSTRAINT "_PatternToTransaction_A_fkey" FOREIGN KEY ("A") REFERENCES "Pattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PatternToTransaction" ADD CONSTRAINT "_PatternToTransaction_B_fkey" FOREIGN KEY ("B") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
