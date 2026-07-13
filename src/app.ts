import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import path from "path";
import fs from "fs";
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

  const publicCandidates = [
    path.join(__dirname, "..", "public"),
    path.join(__dirname, "public"),
    path.join(process.cwd(), "public"),
  ];
  const publicDir = publicCandidates.find((dir) => fs.existsSync(dir));
  if (publicDir) {
    await app.register(fastifyStatic, {
      root: publicDir,
      prefix: "/",
    });
  }

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
