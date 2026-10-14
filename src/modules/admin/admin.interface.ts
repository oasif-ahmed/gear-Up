import { ActiveStatus } from "../../../generated/prisma/enums";

export interface IUpdateUserStatus {
    activeStatus: ActiveStatus;
}
