import bcrypt from "bcrypt";
import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import config from "../../config/index.js";
import { CreateUserPayload, UpdateUserPayload } from "./user.interface.js";
import { AppError } from "../../utils/AppError.js";

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

const updateUserProfile = async (userId: string, payload: UpdateUserPayload) => {
  const { name, email, profilePhoto, phone, bio } = payload;

  if (
    name === undefined &&
    email === undefined &&
    profilePhoto === undefined &&
    phone === undefined &&
    bio === undefined
  ) {
    throw new AppError("Please provide at least one field to update!", 400);
  }

  if (name !== undefined && !name.trim()) {
    throw new AppError("Name cannot be empty!", 400);
  }

  if (email !== undefined && !email.trim()) {
    throw new AppError("Email cannot be empty!", 400);
  }

  if (email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim() },
      select: { id: true },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new AppError("Email is already in use!", 409);
    }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(email !== undefined && { email: email.trim() }),
        },
      });

      if (
        profilePhoto !== undefined ||
        phone !== undefined ||
        bio !== undefined
      ) {
        await tx.profile.upsert({
          where: { userId },
          create: {
            userId,
            profilePhoto: profilePhoto ?? null,
            phone: phone ?? null,
            bio: bio ?? null,
          },
          update: {
            ...(profilePhoto !== undefined && { profilePhoto }),
            ...(phone !== undefined && { phone }),
            ...(bio !== undefined && { bio }),
          },
        });
      }

      return tx.user.findUnique({
        where: { id: userId },
        omit: { password: true },
        include: { profile: true },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("Phone or email is already in use!", 409);
    }
    throw error;
  }
};

export const userService = {
  createUserIntoDB,
  getUserProfile,
  updateUserProfile,
};
