import type { FastifyInstance } from "fastify";
import { create, list, getById } from "../controllers/accounts";
import { authenticate } from "../middleware/auth";

export async function accountRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post("/accounts", create);
  app.get("/accounts", list);
  app.get("/accounts/:accountId", getById);
}
