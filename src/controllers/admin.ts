import type { FastifyRequest, FastifyReply } from "fastify";
import { getAllAccounts } from "../services/account";
import { getAllTransactions } from "../services/transaction";
import { getAuditLogs } from "../services/audit";
import { prisma } from "../lib/prisma";

export async function dashboard(_request: FastifyRequest, reply: FastifyReply) {
  const [userCount, accountCount, transactionCount] = await Promise.all([
    prisma.user.count(),
    prisma.account.count(),
    prisma.transaction.count(),
  ]);

  return reply.send({
    stats: { users: userCount, accounts: accountCount, transactions: transactionCount },
  });
}

export async function listAccounts(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as { limit?: string; offset?: string };
  const result = await getAllAccounts(Number(query.limit) || 50, Number(query.offset) || 0);
  return reply.send(result);
}

export async function listTransactions(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as { limit?: string; offset?: string };
  const result = await getAllTransactions(Number(query.limit) || 50, Number(query.offset) || 0);
  return reply.send(result);
}

export async function listAuditLogs(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as {
    userId?: string;
    action?: string;
    limit?: string;
    offset?: string;
  };
  const result = await getAuditLogs({
    userId: query.userId,
    action: query.action,
    limit: Number(query.limit) || 50,
    offset: Number(query.offset) || 0,
  });
  return reply.send(result);
}
