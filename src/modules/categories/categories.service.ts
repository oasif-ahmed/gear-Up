import { prisma } from "../../lib/prisma";
import { IcreateCategories } from "./categories.interface"

const createCategories = async (payload: IcreateCategories) => {
    const {name, description, image} = payload;

    const categoryExist = await prisma.category.findUnique({
        where: {
            name
        }
    })
    if(categoryExist){
        throw new Error("This Categories Alreay Exists!");
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