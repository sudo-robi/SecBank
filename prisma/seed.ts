import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function seed() {
  const adminPassword = await bcrypt.hash("admin123", 12);
  const userPassword = await bcrypt.hash("user1234", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@secbank.com" },
    update: {},
    create: {
      email: "admin@secbank.com",
      passwordHash: adminPassword,
      name: "Admin User",
      role: Role.ADMIN,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@secbank.com" },
    update: {},
    create: {
      email: "user@secbank.com",
      passwordHash: userPassword,
      name: "Regular User",
      role: Role.USER,
    },
  });

  const adminAccount = await prisma.account.create({
    data: { userId: admin.id, balance: 10000, currency: "USD" },
  });

  const userAccount = await prisma.account.create({
    data: { userId: user.id, balance: 5000, currency: "USD" },
  });

  console.log("Seed complete:");
  console.log(`  Admin: admin@secbank.com / admin123 (account: ${adminAccount.id})`);
  console.log(`  User:  user@secbank.com / user1234  (account: ${userAccount.id})`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
