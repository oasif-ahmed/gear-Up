import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { reviewService } from "./review.service.js";
import { sendResponse } from "../../utils/sendResponse.js";
import httpstatus from "http-status-codes";
import { AppError } from "../../utils/AppError.js";

const createReview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const customerId = req.user?.id;

    if (!customerId) {
        throw new AppError("Unauthorized! Customer id missing.", 401);
    }

    const review = await reviewService.createReview(req.body, customerId);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.CREATED,
        message: "Review created successfully!",
        data: {
            review
        }
    })
})

const getReviewsByGearItem = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const gearItemId = req.params.gearItemId as string;

    if (!gearItemId) {
        throw new AppError("Gear item id is required!", 400);
    }

    const result = await reviewService.getReviewsByGearItem(gearItemId);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "Reviews Retrieved Successfully!",
        data: {
            reviews: result.reviews,
            averageRating: result.averageRating,
            totalReviews: result.totalReviews
        }
    })
})

const getMyReviews = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const customerId = req.user?.id;

    if (!customerId) {
        throw new AppError("Unauthorized! Customer id missing.", 401);
    }

    const reviews = await reviewService.getMyReviews(customerId);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "Reviews Retrieved Successfully!",
        data: {
            reviews
        }
    })
})

const updateReview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const customerId = req.user?.id;
    const reviewId = req.params.id as string;

    if (!customerId) {
        throw new AppError("Unauthorized! Customer id missing.", 401);
    }
    if (!reviewId) {
        throw new AppError("Review id is required!", 400);
    }

    const review = await reviewService.updateReview(reviewId, customerId, req.body);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "Review Updated Successfully!",
        data: {
            review
        }
    })
})

const deleteReview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const customerId = req.user?.id;
    const reviewId = req.params.id as string;

    if (!customerId) {
        throw new AppError("Unauthorized! Customer id missing.", 401);
    }
    if (!reviewId) {
        throw new AppError("Review id is required!", 400);
    }

    const result = await reviewService.deleteReview(reviewId, customerId);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "Review Deleted Successfully!",
        data: {
            review: result
        }
    })
})

export const reviewController = {
    createReview,
    getReviewsByGearItem,
    getMyReviews,
    updateReview,
    deleteReview
}
