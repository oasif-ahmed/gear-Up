import { NextFunction, Request, Response } from "express";
import httpstatus from "http-status-codes";
import { userService } from "./user.service";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

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

export const userController = {
  createUser,
  getUserProfile
};
