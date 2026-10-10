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

export const gearItemController = {
    createGearItem,
    restockGearItem
}
