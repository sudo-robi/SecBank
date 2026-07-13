import type { FastifyInstance } from "fastify";
import { transfer, history } from "../controllers/transactions";
import { authenticate } from "../middleware/auth";

export async function transactionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post("/transactions/transfer", transfer);
  app.get("/transactions", history);
}
