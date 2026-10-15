import { NextFunction, Request, Response } from "express";
import httpstatus from "http-status-codes";
import { userService } from "./user.service.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { AppError } from "../../utils/AppError.js";

const createUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;

    const user = await userService.createUserIntoDB(payload);

    sendResponse(res, {
      success: true,
      statusCode: httpstatus.CREATED,
      message: "user Created Successfully!",
      data: { user },
    });
  },
);

const getUserProfile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const profile = await userService.getUserProfile(userId as string);

  sendResponse(res, {
    success: true,
    statusCode: httpstatus.OK,
    message: "User profile retrived succesfully!",
    data: {
      profile
    }
  })
})

const updateUserProfile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError("Unauthorized! User id missing.", 401);
  }

  const profile = await userService.updateUserProfile(userId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpstatus.OK,
    message: "Profile Updated Successfully!",
    data: {
      profile
    }
  })
})

export const userController = {
  createUser,
  getUserProfile,
  updateUserProfile
};
