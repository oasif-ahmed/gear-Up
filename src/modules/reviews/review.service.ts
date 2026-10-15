import { Prisma } from "../../../generated/prisma/client.js";
import { RentalStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { ICreateReview, IUpdateReview } from "./review.interface.js";

const reviewSelect = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: { id: true, name: true },
  },
  gearItem: {
    select: { id: true, name: true },
  },
} satisfies Prisma.ReviewSelect;

const validateRating = (rating: number) => {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError("rating must be an integer between 1 and 5!", 400);
  }
};

const createReview = async (payload: ICreateReview, customerId: string) => {
  const { gearItemId, rating, comment } = payload;

  if (!gearItemId) {
    throw new AppError("gearItemId is required!", 400);
  }

  validateRating(rating);

  const gearItem = await prisma.gearItem.findUnique({
    where: { id: gearItemId },
    select: { id: true },
  });

  if (!gearItem) {
    throw new AppError("Gear Item not found!", 404);
  }

  // customer can review only after the gear is returned
  const returnedOrder = await prisma.rentalOrder.findFirst({
    where: {
      customerId,
      status: RentalStatus.RETURNED,
      items: {
        some: { gearItemId },
      },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (!returnedOrder) {
    throw new AppError(
      "You can review this gear only after the rental is RETURNED!",
      403,
    );
  }

  try {
    const review = await prisma.review.create({
      data: {
        rating,
        comment: comment ?? null,
        customerId,
        gearItemId,
        rentalOrderId: returnedOrder.id,
      },
      select: reviewSelect,
    });

    return review;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        "You have already reviewed this gear for this rental!",
        409,
      );
    }
    throw error;
  }
};

const getReviewsByGearItem = async (gearItemId: string) => {
  if (!gearItemId) {
    throw new AppError("Gear item id is required!", 400);
  }

  const gearItem = await prisma.gearItem.findUnique({
    where: { id: gearItemId },
    select: { id: true },
  });

  if (!gearItem) {
    throw new AppError("Gear Item not found!", 404);
  }

  const [reviews, aggregate] = await Promise.all([
    prisma.review.findMany({
      where: { gearItemId },
      select: reviewSelect,
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.aggregate({
      where: { gearItemId },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  return {
    reviews,
    averageRating: aggregate._avg.rating
      ? Number(aggregate._avg.rating.toFixed(2))
      : 0,
    totalReviews: aggregate._count.rating,
  };
};

const getMyReviews = async (customerId: string) => {
  const reviews = await prisma.review.findMany({
    where: { customerId },
    select: reviewSelect,
    orderBy: { createdAt: "desc" },
  });

  return reviews;
};

const updateReview = async (
  reviewId: string,
  customerId: string,
  payload: IUpdateReview,
) => {
  if (!reviewId) {
    throw new AppError("Review id is required!", 400);
  }

  const { rating, comment } = payload;

  if (rating === undefined && comment === undefined) {
    throw new AppError("Please provide rating or comment to update!", 400);
  }

  if (rating !== undefined) {
    validateRating(rating);
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, customerId: true },
  });

  if (!review) {
    throw new AppError("Review not found!", 404);
  }

  if (review.customerId !== customerId) {
    throw new AppError("Unauthorized! This is not your review.", 403);
  }

  const updatedReview = await prisma.review.update({
    where: { id: reviewId },
    data: {
      ...(rating !== undefined && { rating }),
      ...(comment !== undefined && { comment }),
    },
    select: reviewSelect,
  });

  return updatedReview;
};

const deleteReview = async (reviewId: string, customerId: string) => {
  if (!reviewId) {
    throw new AppError("Review id is required!", 400);
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, customerId: true },
  });

  if (!review) {
    throw new AppError("Review not found!", 404);
  }

  if (review.customerId !== customerId) {
    throw new AppError("Unauthorized! This is not your review.", 403);
  }

  await prisma.review.delete({ where: { id: reviewId } });

  return { id: review.id };
};

export const reviewService = {
  createReview,
  getReviewsByGearItem,
  getMyReviews,
  updateReview,
  deleteReview,
};
