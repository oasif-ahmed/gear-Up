/*
  Warnings:

  - The values [PENDING,ACTIVE,COMPLETED] on the enum `RentalStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RentalStatus_new" AS ENUM ('PLACED', 'CONFIRMED', 'PAID', 'PICKED_UP', 'RETURNED', 'CANCELLED');
ALTER TABLE "public"."rental_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "rental_orders" ALTER COLUMN "status" TYPE "RentalStatus_new" USING (
  CASE "status"::text
    WHEN 'PENDING' THEN 'PLACED'
    WHEN 'ACTIVE' THEN 'PICKED_UP'
    WHEN 'COMPLETED' THEN 'RETURNED'
    ELSE "status"::text
  END::"RentalStatus_new"
);
ALTER TYPE "RentalStatus" RENAME TO "RentalStatus_old";
ALTER TYPE "RentalStatus_new" RENAME TO "RentalStatus";
DROP TYPE "public"."RentalStatus_old";
ALTER TABLE "rental_orders" ALTER COLUMN "status" SET DEFAULT 'PLACED';
COMMIT;

-- AlterTable
ALTER TABLE "rental_orders" ALTER COLUMN "status" SET DEFAULT 'PLACED';
