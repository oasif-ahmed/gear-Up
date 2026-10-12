import { GearCondition, GearStatus, Prisma } from "../../../generated/prisma/client";


export interface ICreateGearItem {
    name: string;
    description: string;
    brand?: string;
    images?: string[];
    specifications?: Prisma.InputJsonValue;
    condition?: GearCondition;
    pricePerDay: number;
    securityDeposit?: number;
    quantity?: number;
    status?: GearStatus;
    categoryId: string;
}

export interface IUpdateGearItem {
    name?: string;
    description?: string;
    brand?: string;
    images?: string[];
    specifications?: Prisma.InputJsonValue;
    condition?: GearCondition;
    pricePerDay?: number;
    securityDeposit?: number | null;
    quantity?: number;
    status?: GearStatus;
    categoryId?: string;
}

export interface IRestockGearItem {
    quantity: number;
}
