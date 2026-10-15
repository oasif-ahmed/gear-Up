import { Router } from "express";
import { reviewController } from "./review.controller.js";
import { auth } from "../../middleware/auth.js";
import { Role } from "../../../generated/prisma/enums.js";

const router = Router();

router.post("/reviews", auth(Role.CUSTOMER), reviewController.createReview);

router.get("/reviews/gear/:gearItemId", reviewController.getReviewsByGearItem);

router.get("/reviews/my-reviews", auth(Role.CUSTOMER), reviewController.getMyReviews);

router.patch("/reviews/:id", auth(Role.CUSTOMER), reviewController.updateReview);

router.delete("/reviews/:id", auth(Role.CUSTOMER), reviewController.deleteReview);

export const reviewRoute = router;
