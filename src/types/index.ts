import type { Role } from "@prisma/client";

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
};

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}
