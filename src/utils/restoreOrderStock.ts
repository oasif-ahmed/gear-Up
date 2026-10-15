import { Prisma } from "../../generated/prisma/client";

export const restoreOrderStock = async (
  tx: Prisma.TransactionClient,
  rentalOrderId: string,
) => {
  const items = await tx.rentalOrderItem.findMany({
    where: { rentalOrderId },
    select: { gearItemId: true, quantity: true },
  });

  for (const item of items) {
    await tx.gearItem.update({
      where: { id: item.gearItemId },
      data: { quantity: { increment: item.quantity } },
    });

    await tx.gearItem.updateMany({
      where: { id: item.gearItemId, status: "NOT_AVAILABLE" },
      data: { status: "AVAILABLE" },
    });
  }
};
