import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { gearItemService } from "./gearItem.service";
import { sendResponse } from "../../utils/sendResponse";
import httpstatus from "http-status-codes";

const createGearItem = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;
    const providerId = req.user?.id;

    if (!providerId) {
        throw new Error("Unauthorized! Provider id missing.");
    }

    const gearItem = await gearItemService.createGearItem(payload, providerId);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.CREATED,
        message: "Gear Item Created Successfully!",
        data: {
            gearItem
        }
    })
})

const restockGearItem = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const itemId = req.params.id as string;
    const payload = req.body;
    const providerId = req.user?.id;

    if (!providerId) {
        throw new Error("Unauthorized! Provider id missing.");
    }

    if (!itemId) {
        throw new Error("Gear item id is required!");
    }

    const gearItem = await gearItemService.restockGearItem(itemId, payload, providerId);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "Gear Item Restocked Successfully!",
        data: {
            gearItem
        }
    })
})

const updateGearItem = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const itemId = req.params.id as string;
    const payload = req.body;
    const providerId = req.user?.id;

    if (!providerId) {
        throw new Error("Unauthorized! Provider id missing.");
    }

    if (!itemId) {
        throw new Error("Gear item id is required!");
    }

    const gearItem = await gearItemService.updateGearItem(itemId, payload, providerId);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "Gear Item Updated Successfully!",
        data: {
            gearItem
        }
    })
})

const deleteGearItem = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const itemId = req.params.id as string;
    const providerId = req.user?.id;

    if (!providerId) {
        throw new Error("Unauthorized! Provider id missing.");
    }

    if (!itemId) {
        throw new Error("Gear item id is required!");
    }

    const gearItem = await gearItemService.deleteGearItem(itemId, providerId);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "Gear Item Deleted Successfully!",
        data: {
            gearItem
        }
    })
})

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
        throw new Error("Gear item id is required!");
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


const getRentalOrders = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const providerId = req.user?.id;
    const rentalOrders = await gearItemService.getRentalOrders(providerId as string);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "All rental Order retrived successfully!",
        data: {
            rentalOrders
        }
    })
});

const updateRentalOrderStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const providerId = req.user?.id;
    const updateStatus = await gearItemService.updateRentalOrderStatus(providerId as string);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "Rental status updated successfully!",
        data: {
            updateStatus
        }
    })
})

export const gearItemController = {
    createGearItem,
    restockGearItem,
    updateGearItem,
    deleteGearItem,
    getAllGear,
    getGearById,
    getAllCategories,
    getRentalOrders,
    updateRentalOrderStatus
}
