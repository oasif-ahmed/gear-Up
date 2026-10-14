import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import { IloginPayload } from "./auth.interface";
import { jwtUtils } from "../../utils/jwt";
import config from "../../config";
import { SignOptions } from "jsonwebtoken";
import { AppError } from "../../utils/AppError";

const loginUserDB = async (payload: IloginPayload) => {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user || (user && user.activeStatus === "BLOCKED")) {
    throw new AppError("User not found!", 401);
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);

  if (!isPasswordMatch) {
    throw new AppError("Password is Incorrect!", 401);
  }

  // here is the part of creating JWT

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  // create jwt access token
  const jwtAccessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  // creating jwt refresh Token

  const jwtRefreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );
  const { password: _, ...safeUser } = user;
  return {
    user: safeUser,
    jwtAccessToken,
    jwtRefreshToken,
  };
};

export const authService = {
  loginUserDB,
};
