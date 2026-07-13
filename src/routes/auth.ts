import type { FastifyInstance } from "fastify";
import { register, login, refresh, me } from "../controllers/auth";
import { authenticate } from "../middleware/auth";

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", register);
  app.post("/login", login);
  app.post("/refresh", refresh);
  app.get("/me", { preHandler: [authenticate] }, me);
}
