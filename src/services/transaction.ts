import { TransactionStatus, TransactionType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";

export async function transferFunds(
  sourceAccountId: string,
  destinationAccountId: string,
  amount: number,
  initiatedById: string,
  description?: string,
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const destExists = await tx.account.findUnique({
      where: { id: destinationAccountId },
      select: { id: true },
    });
    if (!destExists) {
      throw new AppError(404, "NOT_FOUND", "Destination account not found");
    }

    const { count: debited } = await tx.account.updateMany({
      where: { id: sourceAccountId, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });

    if (debited === 0) {
      throw new AppError(400, "INSUFFICIENT_FUNDS", "Insufficient balance");
    }

    const transaction = await tx.transaction.create({
      data: {
        sourceAccountId,
        destinationAccountId,
        amount,
        type: TransactionType.TRANSFER_OUT,
        status: TransactionStatus.PENDING,
        description,
        initiatedById,
      },
    });

    await tx.account.update({
      where: { id: destinationAccountId },
      data: { balance: { increment: amount } },
    });

    const completed = await tx.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await tx.transaction.create({
      data: {
        sourceAccountId,
        destinationAccountId,
        amount,
        type: TransactionType.TRANSFER_IN,
        status: TransactionStatus.COMPLETED,
        description,
        initiatedById,
      },
    });

    return completed;
  });
}

export async function getTransactionHistory(
  userId: string,
  limit = 50,
  offset = 0,
) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true },
  });
  const accountIds = accounts.map((a) => a.id);

  const where = {
    OR: [
      { sourceAccountId: { in: accountIds } },
      { destinationAccountId: { in: accountIds } },
    ],
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        sourceAccount: { select: { id: true, currency: true } },
        destinationAccount: { select: { id: true, currency: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.transaction.count({ where }),
  ]);

  return { transactions, total };
}

export async function getAllTransactions(limit = 50, offset = 0) {
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      include: {
        sourceAccount: { include: { user: { select: { id: true, email: true, name: true } } } },
        destinationAccount: { include: { user: { select: { id: true, email: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.transaction.count(),
  ]);

  return { transactions, total };
}
