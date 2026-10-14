/*
  Warnings:

  - You are about to drop the column `gearItemId` on the `rental_orders` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerDay` on the `rental_orders` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `rental_orders` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "rental_orders" DROP CONSTRAINT "rental_orders_gearItemId_fkey";

-- DropIndex
DROP INDEX "rental_orders_gearItemId_idx";

-- AlterTable
ALTER TABLE "rental_orders" DROP COLUMN "gearItemId",
DROP COLUMN "pricePerDay",
DROP COLUMN "quantity";

-- CreateTable
CREATE TABLE "rental_order_items" (
    "id" TEXT NOT NULL,
    "rentalOrderId" TEXT NOT NULL,
    "gearItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "pricePerDay" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rental_order_items_rentalOrderId_gearItemId_key" ON "rental_order_items"("rentalOrderId", "gearItemId");

-- AddForeignKey
ALTER TABLE "rental_order_items" ADD CONSTRAINT "rental_order_items_rentalOrderId_fkey" FOREIGN KEY ("rentalOrderId") REFERENCES "rental_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_order_items" ADD CONSTRAINT "rental_order_items_gearItemId_fkey" FOREIGN KEY ("gearItemId") REFERENCES "gear_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
