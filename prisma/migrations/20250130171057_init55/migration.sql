/*
  Warnings:

  - The values [DAILY,QUARTERLY,YEARLY,IRREGULAR] on the enum `Frequency` will be removed. If these variants are still used in the database, this will fail.
  - The values [PERIODIC] on the enum `PatternType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Frequency_new" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');
ALTER TABLE "Pattern" ALTER COLUMN "frequency" TYPE "Frequency_new" USING ("frequency"::text::"Frequency_new");
ALTER TYPE "Frequency" RENAME TO "Frequency_old";
ALTER TYPE "Frequency_new" RENAME TO "Frequency";
DROP TYPE "Frequency_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PatternType_new" AS ENUM ('SUBSCRIPTION', 'RECURRING');
ALTER TABLE "Pattern" ALTER COLUMN "type" TYPE "PatternType_new" USING ("type"::text::"PatternType_new");
ALTER TYPE "PatternType" RENAME TO "PatternType_old";
ALTER TYPE "PatternType_new" RENAME TO "PatternType";
DROP TYPE "PatternType_old";
COMMIT;
