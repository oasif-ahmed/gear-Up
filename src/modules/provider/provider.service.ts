import { Prisma, RentalStatus } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import {
  ICreateGearItem,
  IRestockGearItem,
  IUpdateGearItem,
} from "./provider.interface";
import { AppError } from "../../utils/AppError";
import { restoreOrderStock } from "../../utils/restoreOrderStock";

const createGearItem = async (payload: ICreateGearItem, providerId: string) => {
  const {
    name,
    description,
    brand,
    images,
    specifications,
    condition,
    pricePerDay,
    securityDeposit,
    quantity,
    status,
    categoryId,
  } = payload;

  if (pricePerDay !== undefined && Number(pricePerDay) <= 0) {
    throw new AppError("pricePerDay must be greater than 0!", 400);
  }

  if (
    quantity !== undefined &&
    (!Number.isInteger(quantity) || quantity <= 0)
  ) {
    throw new AppError("quantity must be a positive integer!", 400);
  }

  // 1. Check whether the provider exists
  const provider = await prisma.user.findUnique({
    where: { id: providerId },
    select: { id: true, role: true, activeStatus: true },
  });

  if (!provider) {
    throw new AppError("Provider not found!", 404);
  }

  if (provider.role !== "PROVIDER") {
    throw new AppError("Only providers can create gear listings!", 403);
  }

  if (provider.activeStatus !== "ACTIVE") {
    throw new AppError("Your account is not active!", 403);
  }

  // 2. Check whether the category exists
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new AppError("Category not found!", 404);
  }

  // 3. Always create — identity is enforced by
  // @@unique([providerId, name, brand, categoryId, condition]).
  // Same item != new row. Use restockGearItem with the item id instead.
  try {
    const newItem = await prisma.gearItem.create({
      data: {
        name,
        description,
        brand: brand ?? null,
        images: images ?? [],
        specifications:
          specifications === undefined ? Prisma.DbNull : specifications,
        condition: condition ?? "GOOD",
        pricePerDay: new Prisma.Decimal(pricePerDay.toString()),
        securityDeposit:
          securityDeposit === undefined || securityDeposit === null
            ? null
            : new Prisma.Decimal(securityDeposit.toString()),
        quantity: quantity ?? 1,
        status: status ?? "AVAILABLE",
        categoryId,
        providerId,
      },
    });

    return newItem;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        "This gear already exists for your shop! Use restock to add quantity.",
        409,
      );
    }
    throw error;
  }
};

const restockGearItem = async (
  itemId: string,
  payload: IRestockGearItem,
  providerId: string,
) => {
  const { quantity } = payload;

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new AppError("quantity must be a positive integer!", 400);
  }

  const existingItem = await prisma.gearItem.findFirst({
    where: { id: itemId, providerId },
  });

  if (!existingItem) {
    throw new AppError("Gear item not found for this provider!", 404);
  }

  const updatedItem = await prisma.gearItem.update({
    where: { id: existingItem.id },
    data: {
      quantity: { increment: quantity },
      // Restocked item becomes rentable again
      status: "AVAILABLE",
    },
  });

  return updatedItem;
};

const updateGearItem = async (
  itemId: string,
  payload: IUpdateGearItem,
  providerId: string,
) => {
  const {
    name,
    description,
    brand,
    images,
    specifications,
    condition,
    pricePerDay,
    securityDeposit,
    quantity,
    status,
    categoryId,
  } = payload;

  if (pricePerDay !== undefined && Number(pricePerDay) <= 0) {
    throw new AppError("pricePerDay must be greater than 0!", 400);
  }

  if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 0)) {
    throw new AppError("quantity must be a non-negative integer!", 400);
  }

  // 1. Ensure the item exists and belongs to this provider
  const existingItem = await prisma.gearItem.findFirst({
    where: { id: itemId, providerId },
  });

  if (!existingItem) {
    throw new AppError("Gear item not found for this provider!", 404);
  }

  // 2. Validate the new category if the category is being changed
  if (categoryId !== undefined) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new AppError("Category not found!", 404);
    }
  }

  // 3. Update only the fields that were provided
  const data: Prisma.GearItemUpdateInput = {};

  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (brand !== undefined) data.brand = brand;
  if (images !== undefined) data.images = images;
  if (specifications !== undefined) data.specifications = specifications;
  if (condition !== undefined) data.condition = condition;
  if (pricePerDay !== undefined) {
    data.pricePerDay = new Prisma.Decimal(pricePerDay.toString());
  }
  if (securityDeposit !== undefined) {
    data.securityDeposit =
      securityDeposit === null
        ? null
        : new Prisma.Decimal(securityDeposit.toString());
  }
  if (quantity !== undefined) data.quantity = quantity;
  if (status !== undefined) data.status = status;
  if (categoryId !== undefined) data.category = { connect: { id: categoryId } };

  try {
    const updatedItem = await prisma.gearItem.update({
      where: { id: existingItem.id },
      data,
    });

    return updatedItem;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("This gear already exists for your shop!", 409);
    }
    throw error;
  }
};

const deleteGearItem = async (itemId: string, providerId: string) => {
  const existingItem = await prisma.gearItem.findFirst({
    where: { id: itemId, providerId },
  });

  if (!existingItem) {
    throw new AppError("Gear item not found for this provider!", 404);
  }

  // Rental orders reference gear with onDelete: Restrict.
  // Block deletion so we never lose rental history.
  const rentalOrderCount = await prisma.rentalOrderItem.count({
    where: { gearItemId: existingItem.id },
  });

  if (rentalOrderCount > 0) {
    throw new AppError(
      "This gear item has rental orders and cannot be removed. Mark it as NOT_AVAILABLE instead.",
      409,
    );
  }

  const deletedItem = await prisma.gearItem.delete({
    where: { id: existingItem.id },
  });

  return deletedItem;
};

const getRentalOrders = async (providerId: string) => {
  const orders = await prisma.rentalOrder.findMany({
    where: {
      items: {
        some: {
          gearItem: {
            providerId,
          },
        },
      },
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      totalAmount: true,
      status: true,
      createdAt: true,

      customer: {
        select: {
          name: true,
          email: true,
        },
      },

      items: {
        where: {
          gearItem: {
            providerId,
          },
        },
        select: {
          id: true,
          quantity: true,
          pricePerDay: true,

          gearItem: {
            select: {
              id: true,
              name: true,
              brand: true,
              images: true,
            },
          },
        },
      },
    },
  });
  return orders;
};

const allowedTransitions: Record<RentalStatus, RentalStatus[]> = {
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PAID", "CANCELLED"],
  PAID: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["RETURNED"],
  RETURNED: [],
  CANCELLED: [],
};

const updateRentalOrderStatus = async (
  providerId: string,
  orderId: string,
  newStatus: RentalStatus
) => {
  // 1. Validate the requested status
  if (!Object.hasOwn(allowedTransitions, newStatus)) {
    throw new AppError("Invalid rental order status", 400);
  }

  // 2. Find the order belonging to this provider's gear
  const order = await prisma.rentalOrder.findFirst({
    where: {
      id: orderId,
      items: {
        some: {
          gearItem: {
            providerId,
          },
        },
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!order) {
    throw new AppError("Order not found or access denied", 404);
  }

  // 3. Check whether the transition is allowed
  const allowedStatuses = allowedTransitions[order.status];

  if (!allowedStatuses.includes(newStatus)) {
    throw new AppError(
      `Cannot change status from ${order.status} to ${newStatus}`,
      400,
    );
  }

  // 4. Update the order (restock gear when cancelled or returned)
  const updatedOrder = await prisma.$transaction(async (tx) => {
    const updated = await tx.rentalOrder.update({
      where: {
        id: order.id,
      },
      data: {
        status: newStatus,
      },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        totalAmount: true,
        updatedAt: true,
      },
    });

    if (newStatus === "CANCELLED" || newStatus === "RETURNED") {
      await restoreOrderStock(tx, order.id);
    }

    return updated;
  });

  return updatedOrder;
};

export const providerService = {
  createGearItem,
  restockGearItem,
  updateGearItem,
  deleteGearItem,
  getRentalOrders,
  updateRentalOrderStatus,
};
