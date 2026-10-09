import { Role } from "../../../generated/prisma/enums";

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role
  profilePhoto?: string;
  phone?: string;
  bio?: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  profilePhoto?: string;
  phone?: string;
  bio?: string;
}
