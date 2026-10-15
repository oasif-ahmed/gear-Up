import { Router } from "express";
import { categoryController } from "./categories.controller.js";
import { auth } from "../../middleware/auth.js";
import { Role } from "../../../generated/prisma/enums.js";

const router = Router();

router.post("/categories", auth(Role.ADMIN), categoryController.createCategories);

router.get("/categories", categoryController.getAllCategories);

export const categoryRoute = router;