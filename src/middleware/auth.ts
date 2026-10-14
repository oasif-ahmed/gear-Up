import { NextFunction, Request, Response } from "express";
import { ActiveStatus, Role } from "../../generated/prisma/enums";
import { catchAsync } from "../utils/catchAsync";
import { jwtUtils } from "../utils/jwt";
import config from "../config";
import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";


declare global {
  namespace Express {
    interface Request {
      user?: {
        email: string;
        name: string;
        id: string;
        role: Role
      }
    }
  }
}
export const auth = (...requiredRoles: Role[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.accessToken ? req.cookies.accessToken :
      req.headers.authorization?.startsWith("Bearer ") ?
     req.headers.authorization?.split(" ")[1] : req.headers.authorization;

     if(!token){
      throw new AppError("you are not logged in. Please log in to access this resource!.", 401);
     };


     const verifiedToken = jwtUtils.verifyToken(
      token,
      config.jwt_access_secret,
    );


    if(!verifiedToken.success){
      throw new AppError(verifiedToken.error, 401);
    }

    const { id, name, email, role } = verifiedToken.data as JwtPayload;

    if (requiredRoles.length && !requiredRoles.includes(role)) {
      throw new AppError("You do not have the access to get the resource.", 403)
    }

    const user = await prisma.user.findUnique({
      where: {
        id,
        email,
        name,
        role
      }
    });

    if(!user){
      throw new AppError("User not found. Please login.", 401);
    }
    if(user.activeStatus === ActiveStatus.SUSPEND){
      throw new AppError("Your account has been blocked. Please contact support.", 403)
    }

    req.user = {
      email,
      name,
      id,
      role
    }
    next();
  })
}