import express, { Application, Request, Response } from "express";
import cookieParser from "cookie-parser";
import { userRoutes } from "./modules/user/user.route";
import { authRoute } from "./modules/auth/auth.route";
import { categoryRoute } from "./modules/categories/categories.route";
import { gearPublicRoute } from "./modules/public/gearItem.public.route";
import { rentalOrderRoute } from "./modules/rentalOrder/rentalOrder.route";
import { adminRoute } from "./modules/admin/admin.route";
import { providerRoute } from "./modules/provider/provider.route";
import { globalErrorHandler } from "./middleware/globalErrorHandler";

const app: Application = express();

// middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// default app urls:
app.get("/", (req: Request, res: Response) => {
  res.send("App is working");
});


app.use("/api/auth", userRoutes);
app.use("/api/auth", authRoute);
app.use("/api/admin", categoryRoute);
app.use("/api/admin", adminRoute);
app.use("/api/provider", providerRoute);
app.use("/api", gearPublicRoute);
app.use("/api", rentalOrderRoute)

// global error handler (must be last)
app.use(globalErrorHandler);

export default app;
