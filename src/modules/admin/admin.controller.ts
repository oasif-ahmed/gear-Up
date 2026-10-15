import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { adminService } from "./admin.service.js";
import { sendResponse } from "../../utils/sendResponse.js";
import httpstatus from "http-status-codes";
import { AppError } from "../../utils/AppError.js";

const getAllUsers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const users = await adminService.getAllUsers();

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "All users retrieved successfully!",
        data: {
            users
        }
    })
})

const updateUserStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params.id as string;
    const payload = req.body;

    if (!userId) {
        throw new AppError("User id is required!", 400);
    }

    const user = await adminService.updateUserStatus(userId, payload);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "User status updated successfully!",
        data: {
            user
        }
    })
})

const getAllGear = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const gearItems = await adminService.getAllGear();

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "All gear listings retrieved successfully!",
        data: {
            gearItems
        }
    })
})

const getAllRentalOrders = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const rentalOrders = await adminService.getAllRentalOrders();

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "All rental orders retrieved successfully!",
        data: {
            rentalOrders
        }
    })
})

export const adminController = {
    getAllUsers,
    updateUserStatus,
    getAllGear,
    getAllRentalOrders,
};
