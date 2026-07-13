import type { FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma";
import type { Prisma } from "@prisma/client";

type AuditAction = {
  action: string;
  resource: string;
  resourceId?: string;
  details?: Prisma.InputJsonValue;
};

export async function createAuditLog(
  request: FastifyRequest,
  audit: AuditAction,
) {
  if (!request.user) return;

  await prisma.auditLog.create({
    data: {
      userId: request.user.id,
      action: audit.action,
      resource: audit.resource,
      resourceId: audit.resourceId,
      details: audit.details ?? undefined,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"] ?? undefined,
    },
  });
}
