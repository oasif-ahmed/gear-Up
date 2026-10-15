import { Router } from "express";
import { adminController } from "./admin.controller.js";
import { auth } from "../../middleware/auth.js";
import { Role } from "../../../generated/prisma/enums.js";

const router = Router();

router.get("/users", auth(Role.ADMIN), adminController.getAllUsers);

router.patch("/users/:id", auth(Role.ADMIN), adminController.updateUserStatus);

router.get("/gear", auth(Role.ADMIN), adminController.getAllGear);

router.get("/rentals", auth(Role.ADMIN), adminController.getAllRentalOrders);

export const adminRoute = router;
