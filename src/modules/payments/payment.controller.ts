import { NextFunction, Request, Response } from "express"
import Stripe from "stripe";
import { catchAsync } from "../../utils/catchAsync"
import { paymentService } from "./payment.service";
import { sendResponse } from "../../utils/sendResponse";
import httpstatus from "http-status-codes";
import config from "../../config";
import { AppError } from "../../utils/AppError";
import { stripe } from "../../lib/stripe";

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


const handleWebhook = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Step 1: Get Stripe signature from request headers
    const signature = req.headers["stripe-signature"];

    // Step 2: Get webhook endpoint secret from config
    const webhookEndpointSecret = config.stripe_webhook_secret;

    if (!signature || Array.isArray(signature)) {
      res.status(400).json({
        success: false,
        message: "Missing or invalid Stripe signature",
      });
      return;
    }

    if (!webhookEndpointSecret) {
      res.status(500).json({
        success: false,
        message: "Stripe webhook secret is not configured",
      });
      return;
    }

    // Step 3: Verify signature and construct the Stripe event
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        signature,
        webhookEndpointSecret,
      );
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Webhook signature verification failed",
      });
      return;
    }

    // Step 4: Pass the verified event to the service
    const result = await paymentService.handleWebhook(event);

    // Step 5: Acknowledge the event
    sendResponse(res, {
      success: true,
      statusCode: httpstatus.OK,
      message: "Webhook processed successfully!",
      data: result,
    });
  },
);




const getMyPayments = catchAsync(async(req: Request, res: Response, next: NextFunction) => {
    const customerId = req.user?.id;

    if (!customerId) {
        throw new AppError("Unauthorized! Customer id missing.", 401);
    }

    const payments = await paymentService.getMyPayments(customerId);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "Payment History Retrieved Successfully!",
        data: {
            payments
        }
    })
})

const getPaymentById = catchAsync(async(req: Request, res: Response, next: NextFunction) => {
    const customerId = req.user?.id;
    const paymentId = req.params.id as string;

    if (!customerId) {
        throw new AppError("Unauthorized! Customer id missing.", 401);
    }

    const payment = await paymentService.getPaymentById(paymentId, customerId);

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "Payment Retrieved Successfully!",
        data: {
            payment
        }
    })
})

export const paymentController = {
    createPayment,
    handleWebhook,
    getMyPayments,
    getPaymentById
}