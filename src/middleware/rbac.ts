import type { FastifyRequest, FastifyReply } from "fastify";
import type { Role } from "@prisma/client";
import { ForbiddenError } from "../lib/errors";

export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new ForbiddenError("Authentication required");
    }

    if (!roles.includes(request.user.role)) {
      throw new ForbiddenError("Insufficient permissions");
    }
  };
}
