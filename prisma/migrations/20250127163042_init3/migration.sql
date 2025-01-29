/*
  Warnings:

  - The values [REGULAR] on the enum `PatternType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PatternType_new" AS ENUM ('SUBSCRIPTION', 'RECURRING', 'PERIODIC');
ALTER TABLE "Pattern" ALTER COLUMN "type" TYPE "PatternType_new" USING ("type"::text::"PatternType_new");
ALTER TYPE "PatternType" RENAME TO "PatternType_old";
ALTER TYPE "PatternType_new" RENAME TO "PatternType";
DROP TYPE "PatternType_old";
COMMIT;
