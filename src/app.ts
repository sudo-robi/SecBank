import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env";
import { authRoutes } from "./routes/auth";
import { accountRoutes } from "./routes/accounts";
import { transactionRoutes } from "./routes/transactions";
import { adminRoutes } from "./routes/admin";
import { securityRoutes } from "./routes/security";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { ZodError } from "zod";
import { AppError } from "./lib/errors";
import { prisma } from "./lib/prisma";
import { Role } from "@prisma/client";
import bcrypt from "bcrypt";

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV === "development",
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "SecBank API",
        description:
          "Secure Banking API with role-based access control, JWT auth, atomic transactions, and security monitoring.",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  app.get("/", async () => {
    return {
      name: "SecBank API",
      version: "1.0.0",
      docs: "/docs",
    };
  });

  app.post("/seed", async (request, reply) => {
    const expected = process.env.SEED_KEY;
    const provided = request.headers["x-seed-key"];
    if (!expected || provided !== expected) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const adminPassword = await bcrypt.hash("admin123", 12);
    const userPassword = await bcrypt.hash("user1234", 12);
    const admin = await prisma.user.upsert({
      where: { email: "admin@secbank.com" },
      update: {},
      create: {
        email: "admin@secbank.com",
        passwordHash: adminPassword,
        name: "Admin User",
        role: Role.ADMIN,
      },
    });
    const user = await prisma.user.upsert({
      where: { email: "user@secbank.com" },
      update: {},
      create: {
        email: "user@secbank.com",
        passwordHash: userPassword,
        name: "Regular User",
        role: Role.USER,
      },
    });
    const adminAccount =
      (await prisma.account.findFirst({ where: { userId: admin.id } })) ??
      (await prisma.account.create({
        data: { userId: admin.id, balance: 10000, currency: "USD" },
      }));
    const userAccount =
      (await prisma.account.findFirst({ where: { userId: user.id } })) ??
      (await prisma.account.create({
        data: { userId: user.id, balance: 5000, currency: "USD" },
      }));
    return reply.send({
      admin: admin.email,
      user: user.email,
      adminAccount: adminAccount.id,
      userAccount: userAccount.id,
    });
  });

  await app.register(authRoutes);
  await app.register(accountRoutes);
  await app.register(transactionRoutes);
  await app.register(adminRoutes);
  await app.register(securityRoutes);

  app.setErrorHandler(
    (error: Error & { statusCode?: number }, request, reply) => {
      if (error instanceof ZodError) {
        return reply.status(422).send({
          error: "VALIDATION_ERROR",
          details: error.flatten().fieldErrors,
        });
      }

      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: error.code,
          message: error.message,
        });
      }

      if (error.statusCode === 429) {
        return reply.status(429).send({
          error: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests, please try again later",
        });
      }

      request.log.error(error);
      return reply.status(500).send({
        error: "INTERNAL_ERROR",
        message:
          env.NODE_ENV === "production"
            ? "An unexpected error occurred"
            : error.message,
      });
    },
  );

  await app.ready();
  return app;
}
