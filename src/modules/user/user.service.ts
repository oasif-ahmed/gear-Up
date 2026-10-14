import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import config from "../../config";
import { CreateUserPayload, UpdateUserPayload } from "./user.interface";
import { AppError } from "../../utils/AppError";

const createUserIntoDB = async (payload: CreateUserPayload) => {
  const { name, email, password, role, profilePhoto, phone, bio } = payload;

  const hashedPassword = await bcrypt.hash(
    password,
    Number(config.bcrypt_salt_rounds),
  );

  if (!role) {
    throw new AppError("Role field must be filled before register!", 400);
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (user) {
    throw new AppError("user already Exists.", 409);
  }

  const createdUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      profile: {
        create: {
          profilePhoto,
          phone,
          bio,
        },
      },
      },
      omit: {
          password: true,
        },
        include: {
          profile: true,
        },
    });

  return createdUser;
};

const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    omit: {
      password: true,
    },
    include: {
      profile: true,
    },
  });

  return user;
};

export const userService = {
  createUserIntoDB,
  getUserProfile
};
