import { ActiveStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { IUpdateUserStatus } from "./admin.interface.js";

const getAllUsers = async () => {
    const users = await prisma.user.findMany({
        omit: { password: true },
        include: { profile: true },
        orderBy: { createdAt: "desc" },
    });

    return users;
};

const updateUserStatus = async (userId: string, payload: IUpdateUserStatus) => {
    const { activeStatus } = payload;

    if (!Object.values(ActiveStatus).includes(activeStatus)) {
        throw new AppError("Invalid user status!", 400);
    }

    const existingUser = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!existingUser) {
        throw new AppError("User not found!", 404);
    }

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { activeStatus },
        omit: { password: true },
        include: { profile: true },
    });

    return updatedUser;
};

const getAllGear = async () => {
    const gearItems = await prisma.gearItem.findMany({
        include: {
            category: true,
            provider: {
                omit: { password: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return gearItems;
};

const getAllRentalOrders = async () => {
    const rentalOrders = await prisma.rentalOrder.findMany({
        include: {
            customer: {
                omit: { password: true },
            },
            items: {
                include: {
                    gearItem: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return rentalOrders;
};

export const adminService = {
    getAllUsers,
    updateUserStatus,
    getAllGear,
    getAllRentalOrders,
};
