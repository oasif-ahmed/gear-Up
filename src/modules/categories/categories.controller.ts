import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { categoryService } from "./categories.service.js";
import { sendResponse } from "../../utils/sendResponse.js";
import httpstatus from "http-status-codes";

const createCategories = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;

    const category = await categoryService.createCategories(payload);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.CREATED,
        message: "Category Created Successfully!",
        data: {
            category
        }
    })
})

const getAllCategories = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const categories = await categoryService.getAllCategories();

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "Categories Retrieved Successfully!",
        data: {
            categories
        }
    })
})

export const categoryController = {
    createCategories,
    getAllCategories
}