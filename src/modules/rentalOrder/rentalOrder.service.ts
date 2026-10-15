

import { ActiveStatus, Role, RentalStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { ICreateRentalOrder } from "./rentalOrder.interface";
import { AppError } from "../../utils/AppError";
import { restoreOrderStock } from "../../utils/restoreOrderStock";

const createRentalOrder = async (
  payload: ICreateRentalOrder,
  customerId: string,
) => {
  const { startDate, endDate, items } = payload;

  // Step 1: Validate customer
  const customer = await prisma.user.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw new AppError("Customer not found!", 404);
  }

  if (customer.role !== Role.CUSTOMER) {
    throw new AppError("Unauthorized. You are not a customer!", 403);
  }

  if (customer.activeStatus !== ActiveStatus.ACTIVE) {
    throw new AppError(
      "You have been suspended. You cannot place an order!",
      403,
    );
  }

  // Step 2: Validate items
  if (!items?.length) {
    throw new AppError("Please select at least one gear item!", 400);
  }

  const gearItemIds = items.map((item) => item.gearItemId);

  if (new Set(gearItemIds).size !== gearItemIds.length) {
    throw new AppError("Duplicate gear items are not allowed!", 400);
  }

  // Step 3: Validate rental dates
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    throw new AppError("Invalid rental dates!", 400);
  }

  const rentalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

  // Step 4: Validate quantities
  const quantities = items.map((item) => {
    const quantity = Number(item.quantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new AppError("Invalid quantity!", 400);
    }

    return quantity;
  });

  // Step 5: Create order and update stock transactionally
  const result = await prisma.$transaction(async (tx) => {
    const gearItems = await tx.gearItem.findMany({
      where: {
        id: { in: gearItemIds },
      },
    });

    if (gearItems.length !== gearItemIds.length) {
      throw new AppError("One or more gear items were not found!", 404);
    }

    const gearItemMap = new Map(
      gearItems.map((gear) => [gear.id, gear]),
    );

    let totalAmount = 0;

    const orderItems = items.map((item, index) => {
      const gearItem = gearItemMap.get(item.gearItemId);

      if (!gearItem) {
        throw new AppError("Gear item not found!", 404);
      }

      const quantity = quantities[index]!;

      if (gearItem.quantity < quantity) {
        throw new AppError(
          `Not enough stock for gear item ${gearItem.id}!`,
          409,
        );
      }

      const pricePerDay = Number(gearItem.pricePerDay);

      totalAmount += pricePerDay * rentalDays * quantity;

      return {
        gearItemId: gearItem.id,
        quantity,
        pricePerDay: gearItem.pricePerDay,
      };
    });

    // Step 5.1: Create rental order
    const rentalOrder = await tx.rentalOrder.create({
      data: {
        customerId,
        startDate: start,
        endDate: end,
        totalAmount,
      },
    });

    // Step 5.2: Reduce stock immediately
    for (const item of orderItems) {
      const stockUpdated = await tx.gearItem.updateMany({
        where: {
          id: item.gearItemId,
          quantity: { gte: item.quantity },
        },
        data: {
          quantity: { decrement: item.quantity },
        },
      });

      if (stockUpdated.count !== 1) {
        throw new AppError(
          `Not enough stock for gear item ${item.gearItemId}!`,
          409,
        );
      }
    }

    // Step 5.3: Create rental order items
    await tx.rentalOrderItem.createMany({
      data: orderItems.map((item) => ({
        rentalOrderId: rentalOrder.id,
        gearItemId: item.gearItemId,
        quantity: item.quantity,
        pricePerDay: item.pricePerDay,
      })),
    });

    // Step 5.4: Return order with items
    return tx.rentalOrder.findUniqueOrThrow({
      where: { id: rentalOrder.id },
      include: {
        items: true,
      },
    });
  });

  return result;
};

const getMyRentalOrders = async (customerId: string) => {
  const rentalOrders = await prisma.rentalOrder.findMany({
    where: {
      customerId,
    },
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return rentalOrders;
};

const getRentalOrderById = async (id: string, customerId: string) => {
  const rentalOrder = await prisma.rentalOrder.findUnique({
    where: {
      id,
    },
    include: {
      items: {
        include: {
          gearItem: true,
        },
      },
    },
  });

  if (!rentalOrder) {
    throw new AppError("Rental order not found!", 404);
  }

  if (rentalOrder.customerId !== customerId) {
    throw new AppError("Unauthorized! This is not your rental order.", 403);
  }

  return rentalOrder;
};

const cancelRentalOrder = async (id: string, customerId: string) => {
  if (!id) {
    throw new AppError("Rental order id is required!", 400);
  }

  const order = await prisma.rentalOrder.findUnique({
    where: { id },
    select: { id: true, customerId: true, status: true },
  });

  if (!order) {
    throw new AppError("Rental order not found!", 404);
  }

  if (order.customerId !== customerId) {
    throw new AppError("Unauthorized! This is not your rental order.", 403);
  }

  if (
    order.status !== RentalStatus.PLACED &&
    order.status !== RentalStatus.CONFIRMED
  ) {
    throw new AppError(
      `Only PLACED or CONFIRMED orders can be cancelled! Current status: ${order.status}`,
      400,
    );
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const result = await tx.rentalOrder.updateMany({
      where: {
        id: order.id,
        status: { in: [RentalStatus.PLACED, RentalStatus.CONFIRMED] },
      },
      data: { status: RentalStatus.CANCELLED },
    });

    if (result.count !== 1) {
      throw new AppError("Order can no longer be cancelled!", 409);
    }

    await restoreOrderStock(tx, order.id);

    return tx.rentalOrder.findUnique({
      where: { id: order.id },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        totalAmount: true,
        updatedAt: true,
      },
    });
  });

  return updatedOrder;
};

export const rentalOrderService = {
  createRentalOrder,
  getMyRentalOrders,
  getRentalOrderById,
  cancelRentalOrder,
};
