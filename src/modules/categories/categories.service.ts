import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { IcreateCategories } from "./categories.interface"

const createCategories = async (payload: IcreateCategories) => {
    const {name, description, image} = payload;

    const categoryExist = await prisma.category.findUnique({
        where: {
            name
        }
    })
    if(categoryExist){
        throw new AppError("This Categories Alreay Exists!", 409);
    }

    const createCategory = await prisma.category.create({
        data: {
            name,
            description,
            image
        }
    })
    return createCategory;
}

const getAllCategories = async () => {
    const categories = await prisma.category.findMany({
        include: {
            gearItems: true
        },
        orderBy: {
            createdAt: "desc"
        }
    })
    return categories;
}

export const categoryService = {
    createCategories,
    getAllCategories
}