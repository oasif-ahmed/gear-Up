import { Router } from "express";
import { gearItemController } from "./gearItem.controller";
import { auth } from "../../middleware/auth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post("/gear", auth(Role.PROVIDER), gearItemController.createGearItem);

router.put("/gear/:id", auth(Role.PROVIDER), gearItemController.updateGearItem);

router.delete("/gear/:id", auth(Role.PROVIDER), gearItemController.deleteGearItem);

router.patch("/gear/:id/stock", auth(Role.PROVIDER), gearItemController.restockGearItem);

router.get("/orders", auth(Role.PROVIDER), gearItemController.getRentalOrders);

export const gearItemRoute = router;
