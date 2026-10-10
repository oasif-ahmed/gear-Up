import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ICreateGearItem, IRestockGearItem } from "./gearItem.interface";

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

export const gearItemService = {
    createGearItem,
    restockGearItem,
}
