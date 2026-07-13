import type { FastifyInstance } from "fastify";
import { dashboard, listAccounts, listTransactions, listAuditLogs } from "../controllers/admin";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireRole("ADMIN"));

  app.get("/admin/dashboard", dashboard);
  app.get("/admin/accounts", listAccounts);
  app.get("/admin/transactions", listTransactions);
  app.get("/admin/audit-logs", listAuditLogs);
}
