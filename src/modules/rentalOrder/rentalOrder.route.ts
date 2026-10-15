import { Router } from "express";
import { rentalOrderController } from "./rentalOrder.controller";
import { auth } from "../../middleware/auth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post("/rentals", auth(Role.CUSTOMER), rentalOrderController.createRentalOrder);

router.get("/rentals", auth(Role.CUSTOMER), rentalOrderController.getMyRentalOrders);

router.get("/rentals/:id", auth(Role.CUSTOMER), rentalOrderController.getRentalOrderById);

router.patch("/rentals/:id/cancel", auth(Role.CUSTOMER), rentalOrderController.cancelRentalOrder);

export const rentalOrderRoute = router;