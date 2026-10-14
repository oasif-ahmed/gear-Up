import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

const getAllGear = async (filters: {
  categoryId?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
}) => {
  const { categoryId, brand, minPrice, maxPrice } = filters;

  const where: Prisma.GearItemWhereInput = {};

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (brand) {
    where.brand = { contains: brand, mode: "insensitive" };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.pricePerDay = {};
    if (minPrice !== undefined) {
      where.pricePerDay.gte = new Prisma.Decimal(minPrice.toString());
    }
    if (maxPrice !== undefined) {
      where.pricePerDay.lte = new Prisma.Decimal(maxPrice.toString());
    }
  }

  const gearItems = await prisma.gearItem.findMany({
    where,
    include: {
      category: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return gearItems;
};

const getGearById = async (id: string) => {
  const gearItem = await prisma.gearItem.findUnique({
    where: { id },
    include: {
      category: true,
    },
  });

  if (!gearItem) {
    throw new AppError("Gear item not found!", 404);
  }

  return gearItem;
};

const getAllCategories = async () => {
  const categories = await prisma.category.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return categories;
};

export const gearItemService = {
  getAllGear,
  getGearById,
  getAllCategories,
};
