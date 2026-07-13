import type { FastifyRequest, FastifyReply } from "fastify";
import { createAccount, getUserAccounts, getAccountById } from "../services/account";
import { createAccountSchema } from "../schemas";

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const body = createAccountSchema.parse(request.body);
  const account = await createAccount(request.user!.id, body.currency);
  return reply.status(201).send(account);
}

export async function list(request: FastifyRequest, reply: FastifyReply) {
  const accounts = await getUserAccounts(request.user!.id);
  return reply.send(accounts);
}

export async function getById(request: FastifyRequest, reply: FastifyReply) {
  const { accountId } = request.params as { accountId: string };
  const account = await getAccountById(accountId, request.user!.id);
  return reply.send(account);
}
