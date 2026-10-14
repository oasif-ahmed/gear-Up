import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import {
    ICreateGearItem,
    IRestockGearItem,
    IUpdateGearItem,
} from "./gearItem.interface";

const createGearItem = async (
    payload: ICreateGearItem,
    providerId: string
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
        throw new Error("pricePerDay must be greater than 0!");
    }

    if (quantity !== undefined && (!Number.isInteger(quantity) || quantity <= 0)) {
        throw new Error("quantity must be a positive integer!");
    }

    // 1. Check whether the provider exists
    const provider = await prisma.user.findUnique({
        where: { id: providerId },
        select: { id: true, role: true, activeStatus: true },
    });

    if (!provider) {
        throw new Error("Provider not found!");
    }

    if (provider.role !== "PROVIDER") {
        throw new Error("Only providers can create gear listings!");
    }

    if (provider.activeStatus !== "ACTIVE") {
        throw new Error("Your account is not active!");
    }

    // 2. Check whether the category exists
    const category = await prisma.category.findUnique({
        where: { id: categoryId },
    });

    if (!category) {
        throw new Error("Category not found!");
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
                    specifications === undefined
                        ? Prisma.DbNull
                        : specifications,
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
            throw new Error(
                "This gear already exists for your shop! Use restock to add quantity."
            );
        }
        throw error;
    }
};

const restockGearItem = async (
    itemId: string,
    payload: IRestockGearItem,
    providerId: string  
) => {
    const { quantity } = payload;

    if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error("quantity must be a positive integer!");
    }

    const existingItem = await prisma.gearItem.findFirst({
        where: { id: itemId, providerId },
    });

    if (!existingItem) {
        throw new Error("Gear item not found for this provider!");
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
    providerId: string
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
        throw new Error("pricePerDay must be greater than 0!");
    }

    if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 0)) {
        throw new Error("quantity must be a non-negative integer!");
    }

    // 1. Ensure the item exists and belongs to this provider
    const existingItem = await prisma.gearItem.findFirst({
        where: { id: itemId, providerId },
    });

    if (!existingItem) {
        throw new Error("Gear item not found for this provider!");
    }

    // 2. Validate the new category if the category is being changed
    if (categoryId !== undefined) {
        const category = await prisma.category.findUnique({
            where: { id: categoryId },
        });

        if (!category) {
            throw new Error("Category not found!");
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
            throw new Error("This gear already exists for your shop!");
        }
        throw error;
    }
};

const deleteGearItem = async (itemId: string, providerId: string) => {
    const existingItem = await prisma.gearItem.findFirst({
        where: { id: itemId, providerId },
    });

    if (!existingItem) {
        throw new Error("Gear item not found for this provider!");
    }

    // Rental orders reference gear with onDelete: Restrict.
    // Block deletion so we never lose rental history.
    const rentalOrderCount = await prisma.rentalOrderItem.count({
        where: { gearItemId: existingItem.id },
    });

    if (rentalOrderCount > 0) {
        throw new Error(
            "This gear item has rental orders and cannot be removed. Mark it as NOT_AVAILABLE instead."
        );
    }

    const deletedItem = await prisma.gearItem.delete({
        where: { id: existingItem.id },
    });

    return deletedItem;
};

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
        throw new Error("Gear item not found!");
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
    createGearItem,
    restockGearItem,
    updateGearItem,
    deleteGearItem,
    getAllGear,
    getGearById,
    getAllCategories,
}
