import { NextFunction, Request, Response } from "express"
import { catchAsync } from "../../utils/catchAsync"
import { paymentService } from "./payment.service";
import { sendResponse } from "../../utils/sendResponse";
import httpstatus from "http-status-codes";

const createPayment = catchAsync(async(req: Request, res: Response, next: NextFunction) => {
    const {rentalOrderId} = req.body;
    const customerId = req.user?.id;
    const result = await paymentService.createPayment(rentalOrderId as string, customerId as string);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.CREATED,
        message: "Payment checkout session created Successfully!",
        data: {
            result
        }
    })
})




export const paymentController = {
    createPayment
}