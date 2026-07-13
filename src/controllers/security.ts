import type { FastifyRequest, FastifyReply } from "fastify";
import { getFailedLoginStats, getSuspiciousActivity, getActiveSessions } from "../services/auth";
import { getAuditLogs } from "../services/audit";

export async function securityStats(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as { hours?: string };
  const hours = Number(query.hours) || 24;
  const stats = await getFailedLoginStats(hours);
  return reply.send(stats);
}

export async function suspiciousActivity(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as { hours?: string };
  const hours = Number(query.hours) || 1;
  const activity = await getSuspiciousActivity(hours);
  return reply.send(activity);
}

export async function recentAuditLogs(_request: FastifyRequest, reply: FastifyReply) {
  const result = await getAuditLogs({ limit: 50 });
  return reply.send(result);
}

export async function mySessions(request: FastifyRequest, reply: FastifyReply) {
  const sessions = await getActiveSessions(request.user!.id);
  return reply.send(sessions);
}
