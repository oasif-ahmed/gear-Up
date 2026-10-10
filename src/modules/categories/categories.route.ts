import { Router } from "express";
import { categoryController } from "./categories.controller";
import { auth } from "../../middleware/auth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post("/categories", auth(Role.ADMIN), categoryController.createCategories);

router.get("/categories", categoryController.getAllCategories);

export const categoryRoute = router;