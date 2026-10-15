import { Router } from "express";
import { gearItemController } from "./gearItem.controller.js";

const router = Router();

router.get("/gear", gearItemController.getAllGear);

router.get("/gear/:id", gearItemController.getGearById);

router.get("/categories", gearItemController.getAllCategories);

export const gearPublicRoute = router;
