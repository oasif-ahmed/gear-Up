import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { gearItemService } from "./gearItem.service.js";
import { sendResponse } from "../../utils/sendResponse.js";
import httpstatus from "http-status-codes";
import { AppError } from "../../utils/AppError.js";

const getAllGear = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { categoryId, brand, minPrice, maxPrice, search, availability } = req.query;

    const parsedMinPrice = minPrice !== undefined ? Number(minPrice) : undefined;
    const parsedMaxPrice = maxPrice !== undefined ? Number(maxPrice) : undefined;

    if (parsedMinPrice !== undefined && Number.isNaN(parsedMinPrice)) {
        throw new AppError("minPrice must be a number!", 400);
    }
    if (parsedMaxPrice !== undefined && Number.isNaN(parsedMaxPrice)) {
        throw new AppError("maxPrice must be a number!", 400);
    }

    const gearItems = await gearItemService.getAllGear({
        categoryId: categoryId as string | undefined,
        brand: brand as string | undefined,
        minPrice: parsedMinPrice,
        maxPrice: parsedMaxPrice,
        search: search as string | undefined,
        availability: availability as string | undefined,
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
