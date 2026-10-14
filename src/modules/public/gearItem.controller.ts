import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { gearItemService } from "./gearItem.service";
import { sendResponse } from "../../utils/sendResponse";
import httpstatus from "http-status-codes";
import { AppError } from "../../utils/AppError";

const getAllGear = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { categoryId, brand, minPrice, maxPrice } = req.query;

    const gearItems = await gearItemService.getAllGear({
        categoryId: categoryId as string | undefined,
        brand: brand as string | undefined,
        minPrice: minPrice !== undefined ? Number(minPrice) : undefined,
        maxPrice: maxPrice !== undefined ? Number(maxPrice) : undefined,
    });

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "Gear Items Retrieved Successfully!",
        data: {
            gearItems
        }
    })
})

const getGearById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id as string;

    if (!id) {
        throw new AppError("Gear item id is required!", 400);
    }

    const gearItem = await gearItemService.getGearById(id);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "Gear Item Retrieved Successfully!",
        data: {
            gearItem
        }
    })
})

const getAllCategories = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const categories = await gearItemService.getAllCategories();

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "Categories Retrieved Successfully!",
        data: {
            categories
        }
    })
})

export const gearItemController = {
    getAllGear,
    getGearById,
    getAllCategories,
}
