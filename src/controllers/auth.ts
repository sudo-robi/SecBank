import type { FastifyRequest, FastifyReply } from "fastify";
import { registerUser, loginUser, refreshAccessToken, forgotPassword as forgotPasswordService, resetPassword as resetPasswordService } from "../services/auth";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "../schemas";

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const body = registerSchema.parse(request.body);
  const user = await registerUser(body.email, body.password, body.name);
  return reply.status(201).send(user);
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const body = loginSchema.parse(request.body);
  const result = await loginUser(
    body.email,
    body.password,
    request.ip,
    request.headers["user-agent"],
  );
  return reply.send(result);
}

export async function refresh(request: FastifyRequest, reply: FastifyReply) {
  const { refreshToken } = request.body as { refreshToken: string };
  if (!refreshToken) {
    return reply.status(400).send({ error: "Refresh token required" });
  }
  const result = await refreshAccessToken(refreshToken);
  return reply.send(result);
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  return reply.send(request.user);
}

export async function forgotPassword(request: FastifyRequest, reply: FastifyReply) {
  const body = forgotPasswordSchema.parse(request.body);
  const result = await forgotPasswordService(body.email);
  return reply.send(result);
}

export async function resetPassword(request: FastifyRequest, reply: FastifyReply) {
  const body = resetPasswordSchema.parse(request.body);
  const result = await resetPasswordService(body.token, body.password);
  return reply.send(result);
}
