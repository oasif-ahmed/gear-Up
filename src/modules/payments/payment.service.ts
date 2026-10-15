import Stripe from "stripe";
import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { stripe } from "../../lib/stripe.js";
import { AppError } from "../../utils/AppError.js";

const createPayment = async (rentalOrderId: string, customerId: string) => {
  if (!rentalOrderId) {
    throw new AppError("rentalOrderId is required!", 400);
  }

  const isrentalOrderExistOrNot = await prisma.rentalOrder.findFirst({
    where: {
      id: rentalOrderId,
      customerId,
    },
  });

  if (!isrentalOrderExistOrNot) {
    throw new AppError("Rental Order is not found!", 404);
  }

  if (isrentalOrderExistOrNot.status !== "CONFIRMED") {
    throw new AppError(
      `Rental Order must be CONFIRMED to pay (current: ${isrentalOrderExistOrNot.status}).`,
      409,
    );
  }

  // validation: exactly one payment row per rental order
  const existingPayment = await prisma.payment.findUnique({
    where: { rentalOrderId: isrentalOrderExistOrNot.id },
  });

  let payment;

  if (existingPayment) {
    if (existingPayment.status === "COMPLETED") {
      throw new AppError(
        "Payment already completed for this rental order!",
        409,
      );
    }

    if (
      existingPayment.status === "PENDING" &&
      existingPayment.checkoutSessionId
    ) {
      const existingSession = await stripe.checkout.sessions.retrieve(
        existingPayment.checkoutSessionId,
      );

      // reuse the still-open session instead of creating a duplicate
      if (existingSession.status === "open" && existingSession.url) {
        return {
          paymentId: existingPayment.id,
          checkoutUrl: existingSession.url,
        };
      }
    }

    // FAILED, or PENDING with a dead session → reuse this same row for retry
    payment = existingPayment;
  } else {
    // step 2: main payment table e data save kora
    payment = await prisma.payment.create({
      data: {
        rentalOrderId: isrentalOrderExistOrNot.id,
        amount: isrentalOrderExistOrNot.totalAmount,
      },
    });
  }

  const customer = await prisma.user.findUnique({
    where: {
      id: customerId,
    },
  });
  if (!customer) {
    throw new AppError("Customer not found!", 404);
  }

  // step 3: stripe checkout session create
  const session = await stripe.checkout.sessions.create({
    mode: "payment",

    customer_email: customer?.email,

    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "GearUp Rental",
          },
          unit_amount: Math.round(Number(payment.amount) * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      paymentId: payment.id,
      rentalOrderId: isrentalOrderExistOrNot.id,
    },

    success_url:
      "http://localhost:5173/payment/success?session_id={CHECKOUT_SESSION_ID}",

    cancel_url: "http://localhost:5173/payment/cancel",
  });

  await prisma.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      checkoutSessionId: session.id,
      status: "PENDING",
      amount: isrentalOrderExistOrNot.totalAmount,
    },
  });

  return {
    paymentId: payment.id,
    checkoutUrl: session.url,
  };
};

const handleWebhook = async (event: Stripe.Event) => {
  // Step 1: Handle successful Checkout events
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    // An expired Checkout Session is not a completed payment
    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.paymentId;

      if (!paymentId) {
        return { received: true, processed: false };
      }

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (
        payment &&
        payment.status === "PENDING" &&
        payment.checkoutSessionId === session.id
      ) {
        await prisma.payment.updateMany({
          where: {
            id: paymentId,
            status: "PENDING",
            checkoutSessionId: session.id,
          },
          data: {
            status: "FAILED",
          },
        });
      }

      return { received: true, processed: true };
    }

    return { received: true, processed: false };
  }

  // Step 2: Extract the Checkout Session
  const session = event.data.object as Stripe.Checkout.Session;

  // Step 3: Verify actual payment status
  if (session.payment_status !== "paid") {
    return {
      received: true,
      processed: false,
      reason: "Payment is not completed",
    };
  }

  // Step 4: Read metadata
  const paymentId = session.metadata?.paymentId;
  const rentalOrderId = session.metadata?.rentalOrderId;

  if (!paymentId || !rentalOrderId) {
    throw new AppError("Missing payment metadata!", 400);
  }

  // Step 5: Get Payment record
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new AppError("Payment not found!", 404);
  }

  // Step 6: Verify session and order references
  if (
    payment.checkoutSessionId !== session.id ||
    payment.rentalOrderId !== rentalOrderId
  ) {
    throw new AppError("Payment session verification failed!", 400);
  }

  // Step 7: Idempotency check
  if (payment.status === "COMPLETED") {
    return {
      received: true,
      processed: true,
      paymentId: payment.id,
      status: payment.status,
    };
  }

  if (payment.status !== "PENDING") {
    return {
      received: true,
      processed: false,
      reason: `Payment is already ${payment.status}`,
    };
  }

  // Step 8: Get Stripe PaymentIntent ID
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  // Step 9: Update Payment and RentalOrder atomically
  await prisma.$transaction(async (tx) => {
    const currentPayment = await tx.payment.findUnique({
      where: { id: paymentId },
    });

    if (!currentPayment) {
      throw new AppError("Payment not found!", 404);
    }

    // Handle duplicate deliveries safely
    if (currentPayment.status === "COMPLETED") {
      return;
    }

    if (
      currentPayment.status !== "PENDING" ||
      currentPayment.checkoutSessionId !== session.id
    ) {
      throw new AppError("Payment is no longer pending!", 409);
    }

    // Only a confirmed order can become paid
    const updatedOrder = await tx.rentalOrder.updateMany({
      where: {
        id: rentalOrderId,
        customerId: undefined,
        status: "CONFIRMED",
      },
      data: {
        status: "PAID",
      },
    });

    if (updatedOrder.count !== 1) {
      throw new AppError("Rental Order is not in CONFIRMED status!", 409);
    }

    const updatedPayment = await tx.payment.updateMany({
      where: {
        id: paymentId,
        status: "PENDING",
        checkoutSessionId: session.id,
      },
      data: {
        status: "COMPLETED",
        transactionId: paymentIntentId,
        paidAt: new Date(),
      },
    });

    if (updatedPayment.count !== 1) {
      throw new AppError("Payment could not be completed!", 409);
    }
  });

  return {
    received: true,
    processed: true,
    paymentId,
    status: "COMPLETED",
  };
};

const paymentSelect = {
  id: true,
  amount: true,
  status: true,
  transactionId: true,
  checkoutSessionId: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
  rentalOrder: {
    select: {
      id: true,
      startDate: true,
      endDate: true,
      totalAmount: true,
      status: true,
    },
  },
} satisfies Prisma.PaymentSelect;

const getMyPayments = async (customerId: string) => {
  const payments = await prisma.payment.findMany({
    where: { rentalOrder: { customerId } },
    select: paymentSelect,
    orderBy: { createdAt: "desc" },
  });

  return payments;
};

const getPaymentById = async (paymentId: string, customerId: string) => {
  if (!paymentId) {
    throw new AppError("Payment id is required!", 400);
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      ...paymentSelect,
      rentalOrder: {
        select: {
          id: true,
          customerId: true,
          startDate: true,
          endDate: true,
          totalAmount: true,
          status: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError("Payment not found!", 404);
  }

  if (payment.rentalOrder.customerId !== customerId) {
    throw new AppError("Unauthorized! This is not your payment.", 403);
  }

  return payment;
};

export const paymentService = {
  createPayment,
  handleWebhook,
  getMyPayments,
  getPaymentById,
};
