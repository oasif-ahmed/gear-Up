import app from "./app";
import config from "./config";
import { prisma } from "./lib/prisma";

const port = config.port;

async function main() {
  try {
    await prisma.$connect();
    console.log("Prisma Database connected successfully!");
    app.listen(port, () => {
      console.log(`Server is running on ${port}`);
    });
  } catch (error) {
    console.error("Error starting the server");
    await prisma.$disconnect();
  }
}

main();
