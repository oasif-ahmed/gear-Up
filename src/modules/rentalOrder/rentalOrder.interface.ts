import { Role } from "../../../generated/prisma/enums";

export interface ICreateRentalOrder {
    startDate: string;
    endDate: string;
    items: {
        gearItemId: string,
        quantity: string
    } []
}
