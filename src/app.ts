import express, { Application, Request, Response } from "express";
import cookieParser from "cookie-parser";
import { userRoutes } from "./modules/user/user.route.js";
import { authRoute } from "./modules/auth/auth.route.js";
import { categoryRoute } from "./modules/categories/categories.route.js";
import { gearPublicRoute } from "./modules/public/gearItem.public.route.js";
import { rentalOrderRoute } from "./modules/rentalOrder/rentalOrder.route.js";
import { adminRoute } from "./modules/admin/admin.route.js";
import { providerRoute } from "./modules/provider/provider.route.js";
import { globalErrorHandler } from "./middleware/globalErrorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { paymentRoute } from "./modules/payments/payment.route.js";
import { reviewRoute } from "./modules/reviews/review.route.js";

const app: Application = express();

// Stripe webhook needs the raw body for signature verification,
// so it must be mounted before express.json()
app.use(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
);

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
app.use("/api", rentalOrderRoute);
app.use("/api", reviewRoute);
app.use("/api/payments", paymentRoute);

// 404 for unknown routes
app.use(notFound);

// global error handler (must be last)
app.use(globalErrorHandler);

export default app;
