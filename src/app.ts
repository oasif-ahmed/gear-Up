import express, { Application, Request, Response } from "express";
import cookieParser from "cookie-parser";
import { userRoutes } from "./modules/user/user.route";
import { authRoute } from "./modules/auth/auth.route";

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

export default app;
