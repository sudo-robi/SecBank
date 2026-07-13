import type { FastifyInstance } from "fastify";
import { securityStats, suspiciousActivity, recentAuditLogs, mySessions } from "../controllers/security";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

export async function securityRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireRole("ADMIN"));

  app.get("/admin/security/failed-logins", securityStats);
  app.get("/admin/security/suspicious", suspiciousActivity);
  app.get("/admin/security/audit-log", recentAuditLogs);
  app.get("/admin/security/sessions", mySessions);
}
