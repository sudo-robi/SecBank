import { prisma } from "../lib/prisma";
import { NotFoundError } from "../lib/errors";

export async function createAccount(userId: string, currency = "USD") {
  return prisma.account.create({
    data: { userId, currency },
  });
}

export async function getUserAccounts(userId: string) {
  return prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAccountById(accountId: string, userId: string) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });

  if (!account) throw new NotFoundError("Account");
  return account;
}

export async function getAccountByIdAdmin(accountId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  if (!account) throw new NotFoundError("Account");
  return account;
}

export async function getAllAccounts(limit = 50, offset = 0) {
  const [accounts, total] = await Promise.all([
    prisma.account.findMany({
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.account.count(),
  ]);

  return { accounts, total };
}
