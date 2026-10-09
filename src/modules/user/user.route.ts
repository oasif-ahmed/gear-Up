import { Router } from "express";
import { userController } from "./user.controller";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/auth";

const router = Router();

router.post("/register", userController.createUser);
router.get("/me",auth(Role.ADMIN, Role.CUSTOMER, Role.PROVIDER), userController.getUserProfile);

export const userRoutes = router;
