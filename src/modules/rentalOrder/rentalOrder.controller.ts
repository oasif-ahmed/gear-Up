import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import httpstatus from "http-status-codes";
import { rentalOrderService } from "./rentalOrder.service.js";
import { AppError } from "../../utils/AppError.js";

const createRentalOrder = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;
    // ami to akhn as a customer hishebe order create korteci tai userId na die customerId dilam
    const customerId = req.user?.id;
    const result = await rentalOrderService.createRentalOrder(payload, customerId as string);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.CREATED,
        message: "RentalOrder Created Successfully!",
        data: {
            result
        }
    })
})

const getMyRentalOrders = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const customerId = req.user?.id;

    if (!customerId) {
        throw new AppError("Unauthorized! Customer id missing.", 401);
    }

    const rentalOrders = await rentalOrderService.getMyRentalOrders(customerId);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "Rental Orders Retrieved Successfully!",
        data: {
            rentalOrders
        }
    })
})

const getRentalOrderById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id as string;
    const customerId = req.user?.id;

    if (!customerId) {
        throw new AppError("Unauthorized! Customer id missing.", 401);
    }

    if (!id) {
        throw new AppError("Rental order id is required!", 400);
    }

    const rentalOrder = await rentalOrderService.getRentalOrderById(id, customerId);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "Rental Order Retrieved Successfully!",
        data: {
            rentalOrder
        }
    })
})

const cancelRentalOrder = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id as string;
    const customerId = req.user?.id;

    if (!customerId) {
        throw new AppError("Unauthorized! Customer id missing.", 401);
    }

    const rentalOrder = await rentalOrderService.cancelRentalOrder(id, customerId);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "Rental Order Cancelled Successfully!",
        data: {
            rentalOrder
        }
    })
})

export const rentalOrderController = {
    createRentalOrder,
    getMyRentalOrders,
    getRentalOrderById,
    cancelRentalOrder
}