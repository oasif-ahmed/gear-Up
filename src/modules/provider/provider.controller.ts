import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { providerService } from "./provider.service";
import { sendResponse } from "../../utils/sendResponse";
import httpstatus from "http-status-codes";
import { AppError } from "../../utils/AppError";

const createGearItem = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;
    const providerId = req.user?.id;

    if (!providerId) {
        throw new AppError("Unauthorized! Provider id missing.", 401);
    }

    const gearItem = await providerService.createGearItem(payload, providerId);

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
        throw new AppError("Unauthorized! Provider id missing.", 401);
    }

    if (!itemId) {
        throw new AppError("Gear item id is required!", 400);
    }

    const gearItem = await providerService.restockGearItem(itemId, payload, providerId);

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
        throw new AppError("Unauthorized! Provider id missing.", 401);
    }

    if (!itemId) {
        throw new AppError("Gear item id is required!", 400);
    }

    const gearItem = await providerService.updateGearItem(itemId, payload, providerId);

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
        throw new AppError("Unauthorized! Provider id missing.", 401);
    }

    if (!itemId) {
        throw new AppError("Gear item id is required!", 400);
    }

    const gearItem = await providerService.deleteGearItem(itemId, providerId);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "Gear Item Deleted Successfully!",
        data: {
            gearItem
        }
    })
})

const getRentalOrders = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const providerId = req.user?.id;
    const rentalOrders = await providerService.getRentalOrders(providerId as string);

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
    const newStatus = req.body?.status;
    const rentalOrderId = req.params.id as string;

    if (!providerId) {
        throw new AppError("Unauthorized! Provider id missing.", 401);
    }

    if (!rentalOrderId) {
        throw new AppError("Rental order id is required!", 400);
    }

    if (!newStatus) {
        throw new AppError("Rental order status is required!", 400);
    }

    const updateStatus = await providerService.updateRentalOrderStatus(providerId, rentalOrderId, newStatus);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "Rental status updated successfully!",
        data: {
            updateStatus
        }
    })
})

export const providerController = {
    createGearItem,
    restockGearItem,
    updateGearItem,
    deleteGearItem,
    getRentalOrders,
    updateRentalOrderStatus
}
