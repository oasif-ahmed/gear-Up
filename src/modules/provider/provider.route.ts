import { Router } from "express";
import { providerController } from "./provider.controller.js";
import { auth } from "../../middleware/auth.js";
import { Role } from "../../../generated/prisma/enums.js";

const router = Router();

router.post("/gear", auth(Role.PROVIDER), providerController.createGearItem);

router.put("/gear/:id", auth(Role.PROVIDER), providerController.updateGearItem);

router.delete("/gear/:id", auth(Role.PROVIDER), providerController.deleteGearItem);

router.patch("/gear/:id/stock", auth(Role.PROVIDER), providerController.restockGearItem);

router.get("/orders", auth(Role.PROVIDER), providerController.getRentalOrders);

router.patch("/orders/:id", auth(Role.PROVIDER), providerController.updateRentalOrderStatus);

export const providerRoute = router;
