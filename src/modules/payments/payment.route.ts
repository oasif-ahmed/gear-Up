import { Router } from "express";
import { paymentController } from "./payment.controller.js";
import { auth } from "../../middleware/auth.js";
import { Role } from "../../../generated/prisma/enums.js";

const router = Router();

router.post("/create",auth(Role.CUSTOMER), paymentController.createPayment);

router.get("/", auth(Role.CUSTOMER), paymentController.getMyPayments);

router.get("/:id", auth(Role.CUSTOMER), paymentController.getPaymentById);

router.post("/webhook", paymentController.handleWebhook);

export const paymentRoute = router;