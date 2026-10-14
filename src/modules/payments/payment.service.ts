import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/stripe";
import { AppError } from "../../utils/AppError";

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

  // step 2: main payment table e data save kora

  const payment = await prisma.payment.create({
    data: {
      rentalOrderId: isrentalOrderExistOrNot.id,
      amount: isrentalOrderExistOrNot.totalAmount,
    },
  });

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
          currency: "bdt",
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
    },
  });

  return {
    paymentId: payment.id,
    checkoutUrl: session.url,
  };
};

export const paymentService = {
  createPayment,
};
