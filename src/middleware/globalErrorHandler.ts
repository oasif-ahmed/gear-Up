import { NextFunction, Request, Response } from "express";
import httpstatus from "http-status-codes";
import { Prisma } from "../../generated/prisma/client";
import { AppError } from "../utils/AppError";

export const globalErrorHandler = (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
) => {
    let statusCode: number = httpstatus.INTERNAL_SERVER_ERROR;
    let message = "Something went wrong!";

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        statusCode = httpstatus.BAD_REQUEST;

        switch (err.code) {
            case "P2002":
                statusCode = httpstatus.CONFLICT;
                message = "A record with this value already exists!";
                break;
            case "P2025":
                statusCode = httpstatus.NOT_FOUND;
                message = "Requested record was not found!";
                break;
            case "P2003":
                statusCode = httpstatus.BAD_REQUEST;
                message = "Related record constraint failed!";
                break;
            default:
                message = "Database request error!";
        }
    } else if (err instanceof Error) {
        message = err.message;
    }

    res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        ...(process.env.NODE_ENV === "development" ? { error: err } : {}),
    });
};
