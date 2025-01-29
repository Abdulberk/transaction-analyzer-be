/*
  Warnings:

  - You are about to drop the column `metadata` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `rawData` on the `Transaction` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Transaction_category_idx";

-- DropIndex
DROP INDEX "Transaction_date_idx";

-- DropIndex
DROP INDEX "Transaction_isAnalyzed_idx";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "metadata",
DROP COLUMN "rawData";
