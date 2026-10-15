import { ActiveStatus } from "../../../generated/prisma/enums.js";

export interface IUpdateUserStatus {
    activeStatus: ActiveStatus;
}
