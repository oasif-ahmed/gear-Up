import { Prisma } from "../../../generated/prisma/client.js";
import { GearStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

const getAllGear = async (filters: {
  categoryId?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  availability?: string;
}) => {
  const { categoryId, brand, minPrice, maxPrice, search, availability } = filters;

  const conditions: Prisma.GearItemWhereInput[] = [];

  if (categoryId) {
    conditions.push({ categoryId });
  }

  if (brand) {
    conditions.push({ brand: { contains: brand, mode: "insensitive" } });
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    const pricePerDay: Prisma.GearItemWhereInput["pricePerDay"] = {};
    if (minPrice !== undefined) {
      pricePerDay.gte = new Prisma.Decimal(minPrice.toString());
    }
    if (maxPrice !== undefined) {
      pricePerDay.lte = new Prisma.Decimal(maxPrice.toString());
    }
    conditions.push({ pricePerDay });
  }

  if (search) {
    conditions.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (availability === "in_stock") {
    conditions.push({ quantity: { gt: 0 }, status: GearStatus.AVAILABLE });
  } else if (availability === "out_stock") {
    conditions.push({
      OR: [{ quantity: 0 }, { status: GearStatus.NOT_AVAILABLE }],
    });
  } else if (availability !== undefined) {
    throw new AppError("availability must be either in_stock or out_stock!", 400);
  }

  const where: Prisma.GearItemWhereInput =
    conditions.length > 0 ? { AND: conditions } : {};

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
