import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { UnauthorizedError } from "../lib/errors";

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid authorization header");
  }

  const token = authHeader.slice(7);
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError("User not found or deactivated");
  }

  request.user = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}
