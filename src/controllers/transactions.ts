import type { FastifyRequest, FastifyReply } from "fastify";
import { transferFunds, getTransactionHistory } from "../services/transaction";
import { transferSchema } from "../schemas";
import { createAuditLog } from "../middleware/audit";

export async function transfer(request: FastifyRequest, reply: FastifyReply) {
  const body = transferSchema.parse(request.body);
  const transaction = await transferFunds(
    body.sourceAccountId,
    body.destinationAccountId,
    body.amount,
    request.user!.id,
    body.description,
  );

  await createAuditLog(request, {
    action: "TRANSFER",
    resource: "Transaction",
    resourceId: transaction.id,
    details: { amount: body.amount, from: body.sourceAccountId, to: body.destinationAccountId },
  });

  return reply.status(201).send(transaction);
}

export async function history(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as { limit?: string; offset?: string };
  const result = await getTransactionHistory(
    request.user!.id,
    Number(query.limit) || 50,
    Number(query.offset) || 0,
  );
  return reply.send(result);
}
