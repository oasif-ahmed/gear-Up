import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpstatus from "http-status-codes";
import { rentalOrderService } from "./rentalOrder.service";

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
        throw new Error("Unauthorized! Customer id missing.");
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
        throw new Error("Unauthorized! Customer id missing.");
    }

    if (!id) {
        throw new Error("Rental order id is required!");
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

export const rentalOrderController = {
    createRentalOrder,
    getMyRentalOrders,
    getRentalOrderById
}